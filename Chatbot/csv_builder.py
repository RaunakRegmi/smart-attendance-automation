"""Build the CSV files consumed by rag_indexer from a flat JSON payload.

The payload comes from the backend's /api/chatbot/refresh endpoint and looks like:

    [
      {
        "sno": 1, "name": "Aayush Sharma", "email": "...", "batch": "Autumn 2025",
        "subjects": [
          { "code": "MATH201", "name": "Calculus II",
            "present": 25, "absent": 2, "late": 1 }
        ]
      },
      ...
    ]

Outputs CSVs in ./output/ matching what rag_indexer.py expects.
"""

import os
import pandas as pd

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")


def _status_for_pct(pct: float) -> str:
    if pct >= 90:
        return "Excellent"
    if pct >= 75:
        return "Satisfactory"
    if pct >= 60:
        return "At Risk"
    return "Critical"


def _risk_for_pct(pct: float):
    if pct < 60:
        return "Critical", 90.0, True
    if pct < 75:
        return "High", 70.0, True
    if pct < 85:
        return "Medium", 40.0, False
    return "Low", 15.0, False


def _engagement_tier(score: float) -> str:
    if score >= 85:
        return "Highly Engaged"
    if score >= 70:
        return "Engaged"
    if score >= 50:
        return "Moderately Engaged"
    return "Disengaged"


def _batch_health_tier(pct: float) -> str:
    if pct >= 85:
        return "Healthy"
    if pct >= 70:
        return "Stable"
    if pct >= 55:
        return "Concerning"
    return "Critical"


def build_csvs(students: list) -> None:
    """Generate the CSVs consumed by rag_indexer.build_index()."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ── attendance_summary.csv ──────────────────────────────────────
    summary_rows = []
    for s in students:
        subjects = s.get("subjects", []) or []
        present = sum(int(sub.get("present", 0) or 0) for sub in subjects)
        absent = sum(int(sub.get("absent", 0) or 0) for sub in subjects)
        late = sum(int(sub.get("late", 0) or 0) for sub in subjects)
        total = present + absent + late
        # The downstream indexer treats late as attended (total_present_with_late)
        attended = present + late
        pct = round((attended / total) * 100, 2) if total > 0 else 0.0
        summary_rows.append({
            "sno": int(s.get("sno") or 0),
            "batch": s.get("batch") or "",
            "student_name": s.get("name") or "",
            "email": (s.get("email") or "").strip().lower(),
            "total_present": present,
            "total_absent": absent,
            "total_late": late,
            "total_present_with_late": attended,
            "total_classes": total,
            "attendance_percentage": pct,
            "status": _status_for_pct(pct),
        })
    summary_df = pd.DataFrame(summary_rows)
    summary_df.to_csv(os.path.join(OUTPUT_DIR, "attendance_summary.csv"), index=False)

    # ── risk_assessment.csv ─────────────────────────────────────────
    risk_rows = []
    for row in summary_rows:
        pct = row["attendance_percentage"]
        level, score, needs = _risk_for_pct(pct)
        factors = []
        if pct < 75:
            factors.append("Low overall attendance")
        if row["total_absent"] > row["total_present"] / 2:
            factors.append("High absence count")
        risk_rows.append({
            "sno": row["sno"],
            "student_name": row["student_name"],
            "batch": row["batch"],
            "attendance_percentage": pct,
            "risk_level": level,
            "risk_score": score,
            "intervention_needed": needs,
            "risk_factors": ", ".join(factors) if factors else "None",
        })
    pd.DataFrame(risk_rows).to_csv(os.path.join(OUTPUT_DIR, "risk_assessment.csv"), index=False)

    # ── engagement_scores.csv ───────────────────────────────────────
    eng_rows = []
    for row in summary_rows:
        # Engagement is attendance % minus a small absence penalty
        attendance = row["attendance_percentage"]
        penalty = min(15, row["total_absent"])  # absences erode engagement
        score = max(0.0, min(100.0, attendance - penalty * 0.5))
        reliability = max(0.0, min(100.0, attendance - penalty))
        eng_rows.append({
            "sno": row["sno"],
            "student_name": row["student_name"],
            "engagement_score": round(score, 2),
            "engagement_tier": _engagement_tier(score),
            "reliability_score": round(reliability, 2),
        })
    pd.DataFrame(eng_rows).to_csv(os.path.join(OUTPUT_DIR, "engagement_scores.csv"), index=False)

    # ── student_rankings.csv ────────────────────────────────────────
    rank_rows = []
    by_batch = summary_df.groupby("batch")
    for batch_name, group in by_batch:
        sorted_group = group.sort_values("attendance_percentage", ascending=False).reset_index(drop=True)
        n = len(sorted_group)
        for i, r in sorted_group.iterrows():
            rank = i + 1
            percentile = round((n - rank) / max(1, n - 1) * 100, 1) if n > 1 else 100.0
            rank_rows.append({
                "sno": int(r["sno"]),
                "student_name": r["student_name"],
                "batch": batch_name,
                "attendance_percentage": r["attendance_percentage"],
                "rank_in_batch": rank,
                "percentile_attendance": percentile,
            })
    pd.DataFrame(rank_rows).to_csv(os.path.join(OUTPUT_DIR, "student_rankings.csv"), index=False)

    # ── attendance_trends.csv ───────────────────────────────────────
    # Without weekly granularity, derive a synthetic trend = flat.
    trend_rows = []
    for row in summary_rows:
        pct = row["attendance_percentage"]
        trend_rows.append({
            "sno": row["sno"],
            "student_name": row["student_name"],
            "trend_direction": "Stable",
            "trend_change_pct": 0.0,
            "first_half_attendance_pct": pct,
            "second_half_attendance_pct": pct,
        })
    pd.DataFrame(trend_rows).to_csv(os.path.join(OUTPUT_DIR, "attendance_trends.csv"), index=False)

    # ── batch_analytics.csv ─────────────────────────────────────────
    batch_rows = []
    for batch_name, group in by_batch:
        pcts = group["attendance_percentage"].astype(float)
        avg = round(float(pcts.mean()), 2)
        median = round(float(pcts.median()), 2)
        excellent = int((pcts >= 90).sum())
        satisfactory = int(((pcts >= 75) & (pcts < 90)).sum())
        at_risk = int(((pcts >= 60) & (pcts < 75)).sum())
        critical = int((pcts < 60).sum())
        batch_rows.append({
            "batch": batch_name,
            "total_students": int(len(group)),
            "avg_attendance_pct": avg,
            "median_attendance_pct": median,
            "batch_health_score": avg,
            "batch_health_tier": _batch_health_tier(avg),
            "excellent_count": excellent,
            "satisfactory_count": satisfactory,
            "at_risk_count": at_risk,
            "critical_count": critical,
        })
    pd.DataFrame(batch_rows).to_csv(os.path.join(OUTPUT_DIR, "batch_analytics.csv"), index=False)

    # ── course_performance_summary.csv ──────────────────────────────
    # Aggregate subject metrics across all students.
    course_map: dict = {}
    for s in students:
        for sub in s.get("subjects", []) or []:
            code = sub.get("code") or ""
            if not code:
                continue
            entry = course_map.setdefault(code, {
                "course_code": code,
                "course_name": sub.get("name") or code,
                "_present": 0,
                "_absent": 0,
                "_late": 0,
                "_students": set(),
                "_perfect": 0,
                "_below_75": 0,
            })
            entry["_present"] += int(sub.get("present", 0) or 0)
            entry["_absent"] += int(sub.get("absent", 0) or 0)
            entry["_late"] += int(sub.get("late", 0) or 0)
            entry["_students"].add(s.get("sno"))
            total = (sub.get("present") or 0) + (sub.get("absent") or 0) + (sub.get("late") or 0)
            if total > 0:
                pct = ((sub.get("present") or 0) + (sub.get("late") or 0)) / total * 100
                if pct == 100:
                    entry["_perfect"] += 1
                if pct < 75:
                    entry["_below_75"] += 1
    course_rows = []
    for code, e in course_map.items():
        total_records = e["_present"] + e["_absent"] + e["_late"]
        avg_pct = round((e["_present"] + e["_late"]) / total_records * 100, 2) if total_records else 0.0
        tier = "Strong" if avg_pct >= 85 else ("Healthy" if avg_pct >= 75 else ("Concerning" if avg_pct >= 60 else "Critical"))
        course_rows.append({
            "course_code": code,
            "course_name": e["course_name"],
            "avg_attendance_pct": avg_pct,
            "performance_tier": tier,
            "total_students": len(e["_students"]),
            "students_perfect": e["_perfect"],
            "students_below_75": e["_below_75"],
        })
    pd.DataFrame(course_rows).to_csv(os.path.join(OUTPUT_DIR, "course_performance_summary.csv"), index=False)
