import asyncio
import sys
import os
from sqlmodel import select
from rich.console import Console
from rich.table import Table

# Adjust paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import User, Quiz
from app.core.database import engine, get_session
from ml_engine import train_and_predict_risk

console = Console()

async def run_diagnostics():
    console.print("[bold indigo]🚀 Starting ML Pipeline Diagnostics...[/bold indigo]\n")
    
    async for session in get_session():
        # 1. Fetch all student users
        res = await session.execute(select(User).where(User.role == "student"))
        students = res.scalars().all()
        
        if not students:
            console.print("[bold red]❌ No students found in database. Please run seed script first.[/bold red]")
            return

        total_students = len(students)
        results = {
            "CRITICAL": [],
            "AT RISK": [],
            "STABLE": [],
            "NO DATA": []
        }

        console.print(f"🔍 Analyzing [bold]{total_students}[/bold] students...\n")

        # 2. Iterate and Predict
        for student in students:
            try:
                # Get predictions for all courses for this student
                predictions = await train_and_predict_risk(student.id, session)
                
                if not predictions:
                    results["NO DATA"].append(student.username)
                    continue

                # Determine Risk Level
                scores = [p["predicted_score"] for p in predictions]
                
                if any(s < 50 for s in scores):
                    results["CRITICAL"].append(student.username)
                elif any(s < 65 for s in scores):
                    results["AT RISK"].append(student.username)
                else:
                    results["STABLE"].append(student.username)

            except Exception as e:
                console.print(f"[red]⚠️ Error predicting for {student.username}: {e}[/red]")
                results["NO DATA"].append(student.username)

        # 3. Generate Report
        console.print("[bold underline]📊 Diagnostic Report Summary[/bold underline]\n")
        
        summary_table = Table(show_header=True, header_style="bold magenta")
        summary_table.add_column("Classification", style="dim", width=15)
        summary_table.add_column("Count", justify="right")
        summary_table.add_column("Description")

        summary_table.add_row(
            "[bold red]CRITICAL[/bold red]", 
            str(len(results["CRITICAL"])), 
            "Predicted score < 50% in at least one module."
        )
        summary_table.add_row(
            "[bold yellow]AT RISK[/bold yellow]", 
            str(len(results["AT RISK"])), 
            "Predicted score between 50% and 65%."
        )
        summary_table.add_row(
            "[bold green]STABLE[/bold green]", 
            str(len(results["STABLE"])), 
            "All predicted scores >= 65%."
        )
        summary_table.add_row(
            "[bold grey]NO DATA[/bold grey]", 
            str(len(results["NO DATA"])), 
            "Insufficient quiz data for prediction (e.g. Incomplete tier)."
        )

        console.print(summary_table)
        console.print("")

        # 4. Targeted Critical Printout
        if results["CRITICAL"]:
            console.print("[bold red]🚨 Flagged CRITICAL Students:[/bold red]")
            for username in results["CRITICAL"]:
                console.print(f" - {username}")
        else:
            console.print("[green]✅ No students flagged as CRITICAL.[/green]")
        
        console.print("\n[bold indigo]✅ Diagnostics Complete.[/bold indigo]")
        break # Exit session loop

if __name__ == "__main__":
    asyncio.run(run_diagnostics())
