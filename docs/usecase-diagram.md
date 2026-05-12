# SmartCrop Use Case Diagram

```mermaid
flowchart LR
  farmer[Farmer]
  auth[Firebase Authentication]
  firestore[Cloud Firestore]
  api[SmartCrop Prediction API]
  weather[OpenWeatherMap API]
  openai[OpenAI API]
  notifications[Expo Notifications]

  subgraph system[SmartCrop Mobile App]
    welcome((Open app))
    signup((Create account))
    login((Log in))
    reset((Reset password))
    verify((Verify email))
    setup((Set up farm profile))
    editProfile((Edit farm profile))
    theme((Change dark mode))
    home((View seasonal dashboard))
    weatherView((View weather context))
    recommendations((Get crop recommendations))
    seasonPlan((View planting and harvest plan))
    manual((Run manual sub-county analysis))
    saveHistory((Save prediction to history))
    history((View prediction history))
    filterHistory((Filter history))
    deleteHistory((Delete history item))
    advisor((Ask AI advisor))
    tips((Enable farming tips))
    alerts((Enable weather alerts))
    logout((Log out))
  end

  farmer --> welcome
  farmer --> signup
  farmer --> login
  farmer --> reset
  farmer --> setup
  farmer --> editProfile
  farmer --> theme
  farmer --> home
  farmer --> manual
  farmer --> history
  farmer --> advisor
  farmer --> tips
  farmer --> alerts
  farmer --> logout

  signup -. includes .-> verify
  setup -. includes .-> editProfile
  home -. includes .-> recommendations
  home -. includes .-> weatherView
  home -. includes .-> seasonPlan
  manual -. includes .-> recommendations
  manual -. extends .-> saveHistory
  history -. includes .-> filterHistory
  history -. extends .-> deleteHistory
  tips -. includes .-> recommendations
  alerts -. includes .-> weatherView

  signup --> auth
  login --> auth
  reset --> auth
  verify --> auth
  logout --> auth

  setup --> firestore
  editProfile --> firestore
  saveHistory --> firestore
  history --> firestore
  deleteHistory --> firestore

  recommendations --> api
  manual --> api
  seasonPlan --> api
  weatherView --> weather
  advisor --> openai
  alerts --> notifications
  tips --> notifications
```

## Actors

- Farmer: the primary user who signs in, manages a farm profile, gets crop advice, saves results, and manages alerts.
- Firebase Authentication: handles account creation, login, logout, email verification, and password reset.
- Cloud Firestore: stores farm profile data and prediction history.
- SmartCrop Prediction API: provides soil-zone data, sub-county crop recommendations, and season planning.
- OpenWeatherMap API: provides current weather context for Luwero.
- OpenAI API: powers AI advisor responses.
- Expo Notifications: schedules farming tips and weather alerts on the device.

## Main Use Cases

- Account access: create account, verify email, log in, reset password, and log out.
- Farm profile: set up or edit name, region, sub-county, mapped soil type, and profile photo.
- Seasonal dashboard: view recommended crops, weather context, risk signals, and planting or harvest timing.
- Manual analysis: choose a sub-county, run analysis, and optionally save the result.
- History: view saved recommendations, filter by year or season, load more records, and delete records.
- AI advisor: ask farming questions using the user's sub-county, soil type, and current season as context.
- Preferences: change dark mode, enable farming tips, and enable weather alerts.
