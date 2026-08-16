import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './screens/Home'
import Mix from './screens/Mix'
import MixResult from './screens/MixResult'
import Quiz from './screens/Quiz'
import Result from './screens/Result'
import Stats from './screens/Stats'
import Topic from './screens/Topic'
import Topics from './screens/Topics'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/topics" element={<Topics />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/stats/:topicId" element={<Stats />} />
        <Route path="/stats/:topicId/:lessonId" element={<Stats />} />
        <Route path="/topic/:topicId" element={<Topic />} />
        <Route path="/quiz/:topicId/:lessonId" element={<Quiz />} />
        <Route path="/quiz/:topicId/:lessonId/result" element={<Result />} />
        <Route path="/mix/:mode" element={<Mix />} />
        <Route path="/mix/:mode/result" element={<MixResult />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
