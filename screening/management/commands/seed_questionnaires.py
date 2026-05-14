from django.core.management.base import BaseCommand

from screening.models import Question, Questionnaire

PHQ9_QUESTIONS = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself \u2014 or that you are a failure or have let yourself or your family down",
    "Trouble concentrating on things, such as reading the newspaper or watching television",
    "Moving or speaking so slowly that other people could have noticed? Or the opposite \u2014 being so fidgety or restless that you have been moving around a lot more than usual",
    "Thoughts that you would be better off dead or of hurting yourself in some way",
]

GAD7_QUESTIONS = [
    "Feeling nervous, anxious, or on edge",
    "Not being able to stop or control worrying",
    "Worrying too much about different things",
    "Trouble relaxing",
    "Being so restless that it's hard to sit still",
    "Becoming easily annoyed or irritable",
    "Feeling afraid as if something awful might happen",
]

CBIW_DATA = [
    ("Do you feel worn out at the end of the working day?", False),
    ("Are you exhausted in the morning at the thought of another day at work?", False),
    ("Do you feel that every working hour is tiring for you?", False),
    ("Do you have enough energy for family and friends during leisure time?", True),
    ("Is your work emotionally exhausting?", False),
    ("Does your work frustrate you?", False),
    ("Do you feel burnt out because of your work?", False),
]

WHO5_QUESTIONS = [
    "I have felt cheerful and in good spirits",
    "I have felt calm and relaxed",
    "I have felt active and vigorous",
    "I woke up feeling fresh and rested",
    "My daily life has been filled with things that interest me",
]

WPAI_QUESTIONS = [
    "How many hours did you miss from work because of your health problems?",
    "How many hours did you miss from work because of other reasons?",
    "How many hours did you actually work?",
    "During work, how much did health problems affect your productivity? (0=no effect, 10=complete)",
    "How much did health problems affect your regular daily activities? (0=no effect, 10=complete)",
]

K6_QUESTIONS = [
    "During the past 30 days, how often did you feel nervous?",
    "During the past 30 days, how often did you feel hopeless?",
    "During the past 30 days, how often did you feel restless or fidgety?",
    "During the past 30 days, how often did you feel so depressed that nothing could cheer you up?",
    "During the past 30 days, how often did you feel that everything was an effort?",
    "During the past 30 days, how often did you feel worthless?",
]

WORK_STRESS_DATA = [
    ("I feel overwhelmed by the amount of work I am expected to do", False),
    ("I experience conflict or tension with colleagues or supervisors at work", False),
    ("I am clear about what is expected of me in my role", True),
    ("I have sufficient control over how I perform my work", True),
    ("Work demands interfere with my personal or family time", False),
]

QUESTIONNAIRE_DEFS = [
    {
        "name": "PHQ-9",
        "desc": "Patient Health Questionnaire \u2014 9 questions about depression symptoms over the past two weeks.",
        "max_score": 27,
        "questions": PHQ9_QUESTIONS,
        "scale_max": 3,
    },
    {
        "name": "GAD-7",
        "desc": "Generalized Anxiety Disorder Assessment \u2014 7 questions about anxiety symptoms over the past two weeks.",
        "max_score": 21,
        "questions": GAD7_QUESTIONS,
        "scale_max": 3,
    },
    {
        "name": "CBI-W",
        "desc": "Copenhagen Burnout Inventory (Work-related subscale) \u2014 measures work-related burnout and exhaustion.",
        "max_score": 28,
        "questions": [d[0] for d in CBIW_DATA],
        "scale_max": 4,
        "metadata": {"reverse_items": [i for i, d in enumerate(CBIW_DATA) if d[1]]},
    },
    {
        "name": "WHO-5",
        "desc": "World Health Organization Five Well-Being Index \u2014 measures subjective psychological well-being over the past two weeks.",
        "max_score": 25,
        "questions": WHO5_QUESTIONS,
        "scale_max": 5,
    },
    {
        "name": "WPAI",
        "desc": "Work Productivity and Activity Impairment Questionnaire \u2014 measures absenteeism, presenteeism, and daily activity impairment.",
        "max_score": 100,
        "questions": WPAI_QUESTIONS,
        "scale_max": 10,
        "scoring_type": "wpai",
    },
    {
        "name": "K6",
        "desc": "Kessler 6-Item Psychological Distress Scale \u2014 screens for serious psychological distress over the past 30 days.",
        "max_score": 24,
        "questions": K6_QUESTIONS,
        "scale_max": 4,
    },
    {
        "name": "Work Stress",
        "desc": "Custom Work Stress Scale \u2014 measures workplace stress across five domains: workload, interpersonal, role clarity, autonomy, and work-life balance.",
        "max_score": 20,
        "questions": [d[0] for d in WORK_STRESS_DATA],
        "scale_max": 4,
        "metadata": {"reverse_items": [i for i, d in enumerate(WORK_STRESS_DATA) if d[1]]},
    },
]


class Command(BaseCommand):
    help = "Seed all questionnaires (PHQ-9, GAD-7, CBI-W, WHO-5, WPAI, K6, Work Stress)"

    def handle(self, *args, **options):
        for cfg in QUESTIONNAIRE_DEFS:
            name = cfg["name"]
            q, created = Questionnaire.objects.get_or_create(
                name=name,
                defaults={
                    "description": cfg["desc"],
                    "scoring_type": cfg.get("scoring_type", "sum"),
                    "max_score": cfg["max_score"],
                    "metadata": cfg.get("metadata", {}),
                },
            )
            if created:
                for i, text in enumerate(cfg["questions"], 1):
                    Question.objects.create(
                        questionnaire=q,
                        text=text,
                        order=i,
                        max_score=cfg["scale_max"],
                    )
                self.stdout.write(
                    self.style.SUCCESS(f"Created {name} ({len(cfg['questions'])} questions)")
                )
            else:
                # update metadata in case it changed
                if cfg.get("metadata"):
                    q.metadata = cfg["metadata"]
                    q.save(update_fields=["metadata"])
                self.stdout.write(f"{name} already exists ({q.questions.count()} questions)")

        self.stdout.write(self.style.SUCCESS("Seed complete."))
