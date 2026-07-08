"""
Indexes student data into ChromaDB for RAG-based chatbot.
Run once (or after data updates) before starting the chatbot:
    python rag_indexer.py

Requires ollama running with nomic-embed-text pulled:
    ollama pull nomic-embed-text
"""

import os
import pandas as pd
import chromadb
import ollama

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_db")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
COLLECTION_NAME = "student_data"
EMBED_MODEL = "nomic-embed-text"


def load_data():
    files = {
        "attendance": "attendance_summary.csv",
        "engagement": "engagement_scores.csv",
        "risk": "risk_assessment.csv",
        "trends": "attendance_trends.csv",
        "rankings": "student_rankings.csv",
        "report": "student_reports.csv",
        "weekly": "weekly_attendance_breakdown.csv",
        "batch_analytics": "batch_analytics.csv",
        "course_performance": "course_performance_summary.csv",
    }
    data = {}
    for key, filename in files.items():
        path = os.path.join(OUTPUT_DIR, filename)
        if os.path.exists(path):
            data[key] = pd.read_csv(path)
        else:
            print(f"  Warning: {filename} not found, skipping")
    return data


def build_student_document(sno, data):
    att = data["attendance"][data["attendance"]["sno"] == sno]
    if att.empty:
        return None
    att = att.iloc[0]

    lines = [
        f"Student: {att['student_name']} (ID: {int(att['sno'])})",
        f"Batch: {att['batch']}",
        f"Email: {att['email']}",
        f"Total Classes: {int(att['total_classes'])}",
        f"Present: {int(att['total_present'])}, Absent: {int(att['total_absent'])}, Late: {int(att['total_late'])}",
        f"Attendance: {att['attendance_percentage']:.2f}%",
        f"Status: {att['status']}",
    ]

    if "engagement" in data:
        eng = data["engagement"][data["engagement"]["sno"] == sno]
        if not eng.empty:
            eng = eng.iloc[0]
            lines += [
                f"Engagement Score: {eng['engagement_score']:.2f}/100",
                f"Engagement Tier: {eng['engagement_tier']}",
                f"Reliability Score: {eng['reliability_score']:.2f}/100",
            ]

    if "risk" in data:
        risk = data["risk"][data["risk"]["sno"] == sno]
        if not risk.empty:
            risk = risk.iloc[0]
            lines += [
                f"Risk Level: {risk['risk_level']}",
                f"Risk Score: {risk['risk_score']:.2f}/100",
                f"Intervention Needed: {'Yes' if risk['intervention_needed'] else 'No'}",
                f"Risk Factors: {risk['risk_factors']}",
            ]

    if "trends" in data:
        trend = data["trends"][data["trends"]["sno"] == sno]
        if not trend.empty:
            trend = trend.iloc[0]
            lines += [
                f"Attendance Trend: {trend['trend_direction']} ({trend['trend_change_pct']:+.2f}%)",
                f"First Half: {trend['first_half_attendance_pct']:.2f}%, Second Half: {trend['second_half_attendance_pct']:.2f}%",
            ]

    if "rankings" in data:
        rank = data["rankings"][data["rankings"]["sno"] == sno]
        if not rank.empty:
            rank = rank.iloc[0]
            lines += [
                f"Rank in Batch: #{int(rank['rank_in_batch'])}",
                f"Percentile: {rank['percentile_attendance']:.1f}th",
            ]

    return "\n".join(lines)


def build_batch_document(batch_name, data):
    if "batch_analytics" not in data:
        return None
    ba = data["batch_analytics"][data["batch_analytics"]["batch"] == batch_name]
    if ba.empty:
        return None
    ba = ba.iloc[0]

    batch_students = data["attendance"][data["attendance"]["batch"] == batch_name]
    at_risk_names = batch_students[batch_students["attendance_percentage"] < 75]["student_name"].tolist()

    lines = [
        f"Batch Summary: {batch_name}",
        f"Total Students: {int(ba['total_students'])}",
        f"Average Attendance: {ba['avg_attendance_pct']:.2f}%",
        f"Median Attendance: {ba['median_attendance_pct']:.2f}%",
        f"Batch Health Score: {ba['batch_health_score']:.2f}/100 ({ba['batch_health_tier']})",
        f"Excellent (>=90%): {int(ba['excellent_count'])} students",
        f"Satisfactory (75-90%): {int(ba['satisfactory_count'])} students",
        f"At Risk (60-75%): {int(ba['at_risk_count'])} students",
        f"Critical (<60%): {int(ba['critical_count'])} students",
    ]
    if at_risk_names:
        lines.append(f"Students below 75%: {', '.join(at_risk_names[:15])}")

    return "\n".join(lines)


def build_risk_overview_document(data):
    if "risk" not in data:
        return None

    risk_df = data["risk"]
    critical = risk_df[risk_df["risk_level"] == "Critical"]
    high = risk_df[risk_df["risk_level"] == "High"]
    intervention = risk_df[risk_df["intervention_needed"] == True]

    lines = ["Risk Assessment Overview — All Students"]

    if not critical.empty:
        lines.append(f"\nCritical Risk Students ({len(critical)}):")
        for _, row in critical.iterrows():
            lines.append(
                f"  - {row['student_name']} (ID: {int(row['sno'])}): "
                f"{row['attendance_percentage']:.1f}% attendance, factors: {row['risk_factors']}"
            )

    if not high.empty:
        lines.append(f"\nHigh Risk Students ({len(high)}):")
        for _, row in high.iterrows():
            lines.append(
                f"  - {row['student_name']} (ID: {int(row['sno'])}): "
                f"{row['attendance_percentage']:.1f}% attendance"
            )

    lines.append(f"\nTotal students needing intervention: {len(intervention)}")
    return "\n".join(lines)


def build_course_document(data):
    if "course_performance" not in data or data["course_performance"].empty:
        return None

    lines = ["Course Performance Summary"]
    for _, course in data["course_performance"].iterrows():
        lines += [
            f"\nCourse: {course['course_name']}",
            f"  Average Attendance: {course['avg_attendance_pct']:.2f}%",
            f"  Performance Tier: {course['performance_tier']}",
            f"  Total Students: {int(course['total_students'])}",
            f"  Perfect Attendance: {int(course['students_perfect'])}",
            f"  Below 75%: {int(course['students_below_75'])}",
        ]

    return "\n".join(lines)


def embed(text):
    response = ollama.embeddings(model=EMBED_MODEL, prompt=text)
    return response["embedding"]


def build_index():
    print("Loading data...")
    data = load_data()
    if "attendance" not in data:
        print("Error: attendance_summary.csv not found. Run main.py first.")
        return

    total_students = len(data["attendance"])
    print(f"Found {total_students} students\n")

    client = chromadb.PersistentClient(path=CHROMA_DIR)
    try:
        client.delete_collection(COLLECTION_NAME)
        print("Cleared existing collection")
    except Exception:
        pass
    collection = client.create_collection(COLLECTION_NAME)

    documents, embeddings, ids, metadatas = [], [], [], []

    print("Indexing student profiles...")
    for _, row in data["attendance"].iterrows():
        sno = int(row["sno"])
        doc = build_student_document(sno, data)
        if not doc:
            continue
        documents.append(doc)
        ids.append(f"student_{sno}")
        metadatas.append({"type": "student", "sno": sno, "name": row["student_name"], "batch": row["batch"], "email": str(row["email"]).strip().lower()})
        embeddings.append(embed(doc))
        print(f"  [{len(documents)}/{total_students}] {row['student_name']}")

    print("\nIndexing batch summaries...")
    for batch in data["attendance"]["batch"].unique():
        doc = build_batch_document(batch, data)
        if doc:
            documents.append(doc)
            ids.append(f"batch_{batch.replace(' ', '_').replace('/', '_')}")
            metadatas.append({"type": "batch", "batch": batch})
            embeddings.append(embed(doc))
            print(f"  Batch: {batch}")

    print("\nIndexing risk overview...")
    doc = build_risk_overview_document(data)
    if doc:
        documents.append(doc)
        ids.append("risk_overview")
        metadatas.append({"type": "overview", "topic": "risk"})
        embeddings.append(embed(doc))

    print("Indexing course performance...")
    doc = build_course_document(data)
    if doc:
        documents.append(doc)
        ids.append("course_performance")
        metadatas.append({"type": "overview", "topic": "courses"})
        embeddings.append(embed(doc))

    collection.add(documents=documents, embeddings=embeddings, ids=ids, metadatas=metadatas)

    print(f"\nDone. Indexed {len(documents)} documents into '{CHROMA_DIR}/'")
    print("Next: python chatbot_app.py")


if __name__ == "__main__":
    build_index()
