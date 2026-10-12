import { useState, useCallback, useContext } from 'react'
import { updateProfile } from '../../services/auth'
import { AuthContext } from '../../context/AuthContext'
import OnboardingStep1 from './steps/OnboardingStep1'
import OnboardingStep2 from './steps/OnboardingStep2'
import OnboardingStep3 from './steps/OnboardingStep3'
import OnboardingStep4 from './steps/OnboardingStep4'
import OnboardingStep5 from './steps/OnboardingStep5'

const STEPS = [
  { id: 'welcome', title: 'Bienvenido', component: OnboardingStep1 },
  { id: 'values', title: 'Tus Valores', component: OnboardingStep2 },
  { step: 2, id: 'chronotype', title: 'Tu Cronotipo', component: OnboardingStep3 },
  { step: 3, id: 'energy', title: 'Energía Base', component: OnboardingStep4 },
  { step: 4, id: 'habits', title: 'Hábitos Sugeridos', component: OnboardingStep5 },
]

export default function OnboardingWizard({ onComplete }) {
  const { user } = useContext(AuthContext)
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState({
    values: [],
    dominantValue: '',
    chronotype: null,
    peakHours: { morning: [], afternoon: [], evening: [] },
    energyCheckIn: null,
    selectedHabits: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const updateData = useCallback((key, value) => {
    setData(prev => ({ ...prev, [key]: value }))
  }, [])

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. Guardar perfil completo
      const { error: profileError } = await updateProfile(user.id, {
        completed_onboarding: true,
        dominant_value: data.dominantValue,
        chronotype: data.chronotype,
        peak_hours: data.peakHours,
        habits: data.selectedHabits,
      })
      if (profileError) throw profileError

      // 2. Guardar check-in de energía inicial si existe
      if (data.energyCheckIn) {
        const today = new Date().toISOString().split('T')[0]
        const { supabase } = await import('../../services/supabase')
        await supabase.from('energy_levels').upsert({
          user_id: user.id,
          date: today,
          hour: new Date().getHours(),
          energy_level: data.energyCheckIn,
          source: 'onboarding',
        }, { onConflict: 'user_id,date,hour' })
      }

      onComplete()
    } catch (err) {
      setError(err.message || 'Error completando onboarding')
    } finally {
      setLoading(false)
    }
  }

  const CurrentStepComponent = STEPS[currentStep].component

  return (
    <div className="onboarding-wizard">
      {/* Progress bar */}
      <div className="onboarding-progress" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
        <div className="progress-steps">
          {STEPS.map((step, index) => (
            <div key={step.id} className={`progress-step ${index < currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}>
              <span className="step-number">{index + 1}</span>
              <span className="step-label">{step.title}</span>
            </div>
          ))}
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {/* Step content */}
      <div className="onboarding-content">
        <CurrentStepComponent
          data={data}
          onUpdate={updateData}
          onNext={nextStep}
          onPrev={prevStep}
          isFirst={currentStep === 0}
          isLast={currentStep === STEPS.length - 1}
          user={user}
        />
      </div>

      {/* Navigation */}
      <div className="onboarding-navigation">
        <button
          className="btn-secondary"
          onClick={prevStep}
          disabled={currentStep === 0 || loading}
        >
          ← Anterior
        </button>
        <div className="nav-spacer" />
        {currentStep === STEPS.length - 1 ? (
          <button
            className="btn-primary"
            onClick={handleComplete}
            disabled={loading}
          >
            {loading ? 'Completando...' : 'Comenzar con Vektor'}
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={nextStep}
            disabled={loading}
          >
            Siguiente →
          </button>
        )}
      </div>

      {error && <div className="onboarding-error" role="alert">{error}</div>}
    </div>
  )
}