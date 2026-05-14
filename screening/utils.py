from .models import ScreeningResponse, Question


def calculate_score(session):
    responses = ScreeningResponse.objects.filter(session=session).select_related('question__questionnaire')
    if not responses.exists():
        return None, None

    questionnaires = {}
    for resp in responses:
        q = resp.question
        qn = q.questionnaire
        if qn.name not in questionnaires:
            reverse_items = qn.metadata.get('reverse_items', []) if qn.metadata else []
            questionnaires[qn.name] = {
                'total': 0,
                'max': 0,
                'count': 0,
                'raw_total': 0,
                'reverse_items': reverse_items,
                'scoring_type': qn.scoring_type,
                'questionnaire_id': qn.id,
            }
        score = resp.score
        idx = q.order - 1
        if idx in questionnaires[qn.name]['reverse_items']:
            score = q.max_score - resp.score
        questionnaires[qn.name]['raw_total'] += resp.score
        questionnaires[qn.name]['total'] += score
        questionnaires[qn.name]['max'] += q.max_score
        questionnaires[qn.name]['count'] += 1

    results = {}
    overall_total = 0
    for name, data in questionnaires.items():
        sev = get_severity(name, data['total'])
        results[name] = {
            'score': data['total'],
            'max': data['max'],
            'severity': sev,
            'scoring_type': data['scoring_type'],
            'raw_total': data['raw_total'],
        }
        overall_total += data['total']

    results['overall'] = overall_total
    return results, questionnaires


def get_severity(questionnaire_name, score):
    SEVERITY_MAP = {
        'PHQ-9': [(4, 'Minimal'), (9, 'Mild'), (14, 'Moderate'), (999, 'Severe')],
        'GAD-7': [(4, 'Minimal'), (9, 'Mild'), (14, 'Moderate'), (999, 'Severe')],
        'CBI-W': [(7, 'Low'), (14, 'Moderate'), (21, 'High'), (999, 'Severe')],
        'K6': [(7, 'Low'), (12, 'Moderate'), (999, 'Severe')],
        'Work Stress': [(4, 'Low'), (9, 'Mild'), (14, 'Moderate'), (999, 'Severe')],
    }
    if questionnaire_name == 'WHO-5':
        if score <= 12:
            return 'Poor'
        elif score <= 18:
            return 'Fair'
        elif score <= 22:
            return 'Good'
        else:
            return 'Excellent'
    if questionnaire_name == 'WPAI':
        return _wpaic_severity(score)

    thresholds = SEVERITY_MAP.get(questionnaire_name, [(4, 'Minimal'), (9, 'Mild'), (14, 'Moderate'), (999, 'Severe')])
    for threshold, level in thresholds:
        if score <= threshold:
            return level
    return 'Unknown'


def _wpaic_severity(score):
    if score <= 20:
        return 'Minimal'
    elif score <= 40:
        return 'Mild'
    elif score <= 60:
        return 'Moderate'
    else:
        return 'Severe'


def get_recommendations(questionnaire_name, severity):
    recs = {
        'PHQ-9': {
            'Minimal': [
                'Your results suggest minimal to no depression symptoms.',
                'Continue maintaining healthy sleep, exercise, and social habits.',
                'Practice mindfulness or relaxation techniques if desired.',
            ],
            'Mild': [
                'Your results suggest mild depression symptoms.',
                'Consider speaking with a counselor or therapist.',
                'Maintain a regular sleep schedule and physical activity routine.',
                'Practice stress-management techniques such as deep breathing or meditation.',
            ],
            'Moderate': [
                'Your results suggest moderate depression symptoms.',
                'We strongly recommend consulting a mental health professional.',
                'Reach out to your HR department about Employee Assistance Programs (EAP).',
                'Avoid isolation \u2014 stay connected with trusted friends or family.',
                'Consider speaking with your primary care physician about your symptoms.',
            ],
            'Severe': [
                'Your results suggest severe depression symptoms.',
                'Please seek professional help immediately.',
                'Contact a mental health crisis line in your area.',
                'Reach out to your HR department about immediate support resources.',
                'Do not hesitate \u2014 your health and safety are the top priority.',
                'If you are having thoughts of self-harm, please call emergency services immediately.',
            ],
        },
        'GAD-7': {
            'Minimal': [
                'Your results suggest minimal to no anxiety symptoms.',
                'Continue your current stress-management practices.',
                'Regular exercise and adequate sleep can help maintain emotional balance.',
            ],
            'Mild': [
                'Your results suggest mild anxiety symptoms.',
                'Consider mindfulness or relaxation exercises.',
                'Limit caffeine and alcohol intake.',
                'Practice deep breathing when feeling stressed.',
            ],
            'Moderate': [
                'Your results suggest moderate anxiety symptoms.',
                'We recommend consulting with a mental health professional.',
                'Reach out to your HR department about Employee Assistance Programs (EAP).',
                'Consider cognitive-behavioral therapy (CBT) techniques.',
                'Regular physical activity can help reduce anxiety symptoms.',
            ],
            'Severe': [
                'Your results suggest severe anxiety symptoms.',
                'Please seek professional help as soon as possible.',
                'Contact your healthcare provider or a mental health specialist.',
                'Reach out to your HR department for immediate support resources.',
                'Practice grounding techniques when feeling overwhelmed.',
            ],
        },
        'CBI-W': {
            'Low': ['Your work-related burnout levels are low.', 'Maintain your current work-life balance practices.', 'Regular breaks and boundaries help prevent burnout.'],
            'Moderate': ['Your results suggest moderate work-related burnout.', 'Consider reviewing your workload with your manager.', 'Ensure you are taking adequate breaks during the workday.', 'Practice boundary-setting between work and personal time.'],
            'High': ['Your results suggest high work-related burnout.', 'We recommend discussing workload adjustments with your HR department.', 'Consider speaking with a mental health professional.', 'Prioritize rest and recovery outside of work hours.'],
            'Severe': ['Your results suggest severe work-related burnout.', 'Please speak with your manager or HR about immediate support.', 'Consider taking time off to recover.', 'Consult a healthcare professional as soon as possible.'],
        },
        'WHO-5': {
            'Poor': ['Your well-being score suggests room for improvement.', 'Consider speaking with a mental health professional.', 'Focus on self-care, sleep, and physical activity.'],
            'Fair': ['Your well-being is moderate.', 'Consider activities that boost your mood and energy.', 'Stay connected with supportive people.'],
            'Good': ['Your well-being is good.', 'Continue your current healthy habits.', 'Maintain social connections and physical activity.'],
            'Excellent': ['Your well-being is excellent.', 'Keep up your healthy routines!', 'Support colleagues who may be struggling.'],
        },
        'K6': {
            'Low': ['Your psychological distress levels are low.', 'Continue your current coping strategies.', 'Stay connected with your support network.'],
            'Moderate': ['Your results suggest moderate psychological distress.', 'Consider speaking with a counselor.', 'Practice stress-reduction techniques like meditation or deep breathing.'],
            'Severe': ['Your results suggest serious psychological distress.', 'Please seek professional help as soon as possible.', 'Contact a mental health crisis line if needed.', 'Reach out to your HR department for support resources.'],
        },
        'Work Stress': {
            'Low': ['Your work stress levels are low.', 'Continue your current stress-management practices.', 'Maintain healthy work boundaries.'],
            'Mild': ['Your results suggest mild work-related stress.', 'Identify specific stressors and address them proactively.', 'Practice relaxation techniques during the workday.', 'Consider discussing concerns with your manager.'],
            'Moderate': ['Your results suggest moderate work-related stress.', 'We recommend speaking with your manager about workload or role clarity.', 'Consider mindfulness or stress-management programs.', 'Ensure you are taking regular breaks and time off.'],
            'Severe': ['Your results suggest severe work-related stress.', 'Please speak with your HR department about support options.', 'Consider taking time off to address stress levels.', 'Consult with a healthcare professional.'],
        },
        'WPAI': {
            'Minimal': ['Your work productivity impact is minimal.', 'Continue managing your health effectively.', 'Maintain your current work habits.'],
            'Mild': ['Your health has a mild impact on productivity.', 'Consider strategies to manage symptoms at work.', 'Speak with your manager about flexible work options if needed.'],
            'Moderate': ['Your health is moderately impacting your productivity.', 'Consider discussing workplace accommodations with HR.', 'Review your workload and prioritize tasks.', 'Consult with a healthcare professional about managing symptoms.'],
            'Severe': ['Your health is severely impacting your productivity.', 'Please speak with HR about support and accommodations.', 'Consider taking time off to focus on recovery.', 'Consult with a healthcare professional as soon as possible.'],
        },
    }
    return recs.get(questionnaire_name, {}).get(severity, [])
