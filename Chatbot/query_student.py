import pandas as pd
import os
import sys
from pathlib import Path

OUTPUT_DIR = "output"

ATTENDANCE_FILE = os.path.join(OUTPUT_DIR, "attendance_summary.csv")
ENGAGEMENT_FILE = os.path.join(OUTPUT_DIR, "engagement_scores.csv")
RISK_FILE = os.path.join(OUTPUT_DIR, "risk_assessment.csv")
TRENDS_FILE = os.path.join(OUTPUT_DIR, "attendance_trends.csv")
RANKINGS_FILE = os.path.join(OUTPUT_DIR, "student_rankings.csv")
STUDENT_REPORT_FILE = os.path.join(OUTPUT_DIR, "student_reports.csv")
WEEKLY_BREAKDOWN_FILE = os.path.join(OUTPUT_DIR, "weekly_attendance_breakdown.csv")


def load_all_data():
    """Load all CSV files into memory."""
    data = {}
    
    try:
        data['attendance'] = pd.read_csv(ATTENDANCE_FILE)
        data['engagement'] = pd.read_csv(ENGAGEMENT_FILE)
        data['risk'] = pd.read_csv(RISK_FILE)
        data['trends'] = pd.read_csv(TRENDS_FILE)
        data['rankings'] = pd.read_csv(RANKINGS_FILE)
        data['report'] = pd.read_csv(STUDENT_REPORT_FILE)
        data['weekly'] = pd.read_csv(WEEKLY_BREAKDOWN_FILE)
    except FileNotFoundError as e:
        print(f"Error: Missing data file - {e}")
        sys.exit(1)
    
    return data


def search_student(query, data):
    """Search for student by ID (sno) or name."""
    query_str = str(query).strip().lower()
    
    try:
        sno = int(query)
        matches = data['attendance'][data['attendance']['sno'] == sno]
        if not matches.empty:
            return int(sno)
    except ValueError:
        pass
    
    name_matches = data['attendance'][
        data['attendance']['student_name'].str.lower().str.contains(query_str, na=False)
    ]
    
    if not name_matches.empty:
        if len(name_matches) == 1:
            return int(name_matches.iloc[0]['sno'])
        else:
            print(f"\n📌 Multiple matches found for '{query}':")
            for idx, (_, row) in enumerate(name_matches.iterrows(), 1):
                print(f"  {idx}. ID: {int(row['sno'])} - {row['student_name']} ({row['batch']})")
            return None
    
    return None


def display_student_profile(sno, data):
    """Display comprehensive student profile."""
    
    # Get data from each source
    att = data['attendance'][data['attendance']['sno'] == sno].iloc[0]
    eng = data['engagement'][data['engagement']['sno'] == sno]
    risk = data['risk'][data['risk']['sno'] == sno].iloc[0]
    trends = data['trends'][data['trends']['sno'] == sno].iloc[0]
    rank = data['rankings'][data['rankings']['sno'] == sno].iloc[0]
    
    # Get weekly data
    weekly_row = data['weekly'][data['weekly']['sno'] == sno]
    
    # Get course data
    report = data['report'][data['report']['sno'] == sno]
    
    print("\n" + "="*70)
    print(f"  👤 STUDENT PROFILE - {att['student_name'].upper()}")
    print("="*70)
    
    print(f"\nBASIC INFORMATION")
    print(f"  Student ID           : {int(att['sno'])}")
    print(f"  Batch                : {att['batch']}")
    print(f"  Email                : {att['email']}")
    
    print(f"\nATTENDANCE SUMMARY")
    print(f"  Total Classes        : {int(att['total_classes'])}")
    print(f"  Present              : {int(att['total_present'])}")
    print(f"  Absent               : {int(att['total_absent'])}")
    print(f"  Late                 : {int(att['total_late'])}")
    print(f"  Present + Late       : {int(att['total_present_with_late'])}")
    print(f"  Attendance %         : {att['attendance_percentage']:.2f}%")
    print(f"  Status               : {att['status']}")
    
    # Rankings
    print(f"\nRANKINGS (Within Batch)")
    print(f"  Percentile           : {rank['percentile_attendance']:.2f}th percentile")
    print(f"  Rank in Batch        : #{int(rank['rank_in_batch'])}")
    
    if not eng.empty:
        eng_row = eng.iloc[0]
        print(f"\nENGAGEMENT & RELIABILITY")
        print(f"  Engagement Score     : {eng_row['engagement_score']:.2f}/100")
        print(f"  Engagement Tier      : {eng_row['engagement_tier']}")
        print(f"  Reliability Score    : {eng_row['reliability_score']:.2f}/100")
        print(f"  Consistency Penalty  : {int(eng_row['consistency_penalty'])} points")
    
    # Trends
    print(f"\nATTENDANCE TRENDS")
    print(f"  First Half Avg       : {trends['first_half_attendance_pct']:.2f}%")
    print(f"  Second Half Avg      : {trends['second_half_attendance_pct']:.2f}%")
    print(f"  Trend Change         : {trends['trend_change_pct']:+.2f}%")
    print(f"  Direction            : {trends['trend_direction']}")
    
    # Risk Assessment
    print(f"\nRISK ASSESSMENT")
    print(f"  Risk Score           : {risk['risk_score']:.2f}/100")
    print(f"  Risk Level           : {risk['risk_level']}")
    print(f"  Intervention Needed  : {'Yes ⛔' if risk['intervention_needed'] else 'No ✓'}")
    risk_factors = str(risk['risk_factors']).split('|')
    if risk_factors and risk_factors[0] != 'none':
        print(f"  Risk Factors         : {', '.join(risk_factors)}")
    
    # Course Performance
    course_cols = [col for col in report.columns if 'total_classes' in col]
    if not report.empty and len(course_cols) > 0:
        print(f"\nCOURSE PERFORMANCE")
        
        courses_info = {
            'cmp5367_artificial_intelligence_and_machine_learning': 'CMP5367 - AI & ML',
            'dig5127_database_web_application_development': 'DIG5127 - Database & Web Dev',
            'cmp5332_object_oriented_programming': 'CMP5332 - OOP'
        }
        
        for course_key, course_name in courses_info.items():
            classes_col = f"{course_key}_total_classes"
            present_col = f"{course_key}_total_present"
            pct_col = f"{course_key}_present_percentage"
            
            if classes_col in report.columns and present_col in report.columns:
                classes = report[classes_col].iloc[0]
                present = report[present_col].iloc[0]
                pct = report[pct_col].iloc[0]
                
                if pd.notna(classes) and classes > 0:
                    print(f"  {course_name}")
                    print(f"    - Classes: {int(classes)}, Present: {int(present)}, Attendance: {pct:.2f}%")
    
    # Weekly Breakdown
    if not weekly_row.empty:
        print(f"\nWEEKLY ATTENDANCE BREAKDOWN")
        week_cols = [col for col in weekly_row.columns if col.startswith('week_') and col.endswith('_attendance_ratio')]
        if week_cols:
            for col in sorted(week_cols):
                week_num = col.split('_')[1]
                ratio = weekly_row[col].iloc[0]
                if pd.notna(ratio):
                    bar_length = int(ratio * 20)
                    bar = "█" * bar_length + "░" * (20 - bar_length)
                    print(f"  Week {week_num:2} : {bar} {ratio*100:.0f}%")
    
    print("\n" + "="*70 + "\n")


def list_all_students(data):
    """List all students in the batch."""
    students = data['attendance'][['sno', 'student_name', 'batch', 'attendance_percentage', 'status']].copy()
    students = students.sort_values('sno')
    
    print("\n" + "="*70)
    print(f"ALL STUDENTS ({len(students)} total)")
    print("="*70 + "\n")
    print(f"{'ID':<6} {'Student Name':<30} {'Batch':<20} {'Attendance':<12} {'Status':<15}")
    print("-" * 70)
    
    for _, row in students.iterrows():
        print(f"{int(row['sno']):<6} {row['student_name']:<30} {row['batch']:<20} {row['attendance_percentage']:>6.2f}%  {row['status']:<15}")
    
    print("\n")


def interactive_mode(data):
    """Run in interactive mode for searching."""
    while True:
        print("\n" + "="*70)
        print("STUDENT QUERY TOOL")
        print("="*70)
        print("\nOptions:")
        print("  [1] Search by Student ID (number)")
        print("  [2] Search by Student Name (text)")
        print("  [3] List all students")
        print("  [4] Exit")
        print()
        
        choice = input("Enter your choice (1-4): ").strip()
        
        if choice == '1':
            try:
                sno = int(input("Enter Student ID: "))
                if sno in data['attendance']['sno'].values:
                    display_student_profile(sno, data)
                else:
                    print(f"Student ID {sno} not found.")
            except ValueError:
                print("Invalid input. Please enter a number.")
        
        elif choice == '2':
            name = input("Enter Student Name (partial search): ").strip()
            sno = search_student(name, data)
            if sno is not None:
                display_student_profile(sno, data)
            elif sno is None and name:
                print(f"No student found matching '{name}'.")
        
        elif choice == '3':
            list_all_students(data)
        
        elif choice == '4':
            print("\nGoodbye\n")
            break
        
        else:
            print("Invalid choice. Please try again.")


def main():
    print("\nLoading student data...")
    data = load_all_data()
    print(f"Loaded data for {len(data['attendance'])} students\n")
    
    if len(sys.argv) > 1:
        query = sys.argv[1]
        sno = search_student(query, data)
        
        if sno is not None:
            display_student_profile(sno, data)
        else:
            print(f"Student '{query}' not found.\n")
            print("Try running with no arguments for interactive mode.")
    else:
        # Interactive mode
        interactive_mode(data)


if __name__ == "__main__":
    main()
