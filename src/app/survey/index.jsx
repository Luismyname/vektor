import SurveyForm from './components/SurveyForm'
import OnboardingHeader from './components/OnboardingHeader'
import { useState } from 'react'

export default function Survey() {
  const [formVersion, setFormVersion] = useState(0)

  return (
    <div className="onboarding-page">
      <OnboardingHeader onSignedOut={() => setFormVersion((version) => version + 1)} />
      <SurveyForm key={formVersion} />
    </div>
  )
}
