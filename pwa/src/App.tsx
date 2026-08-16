import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './screens/Home'
import Quiz from './screens/Quiz'
import Result from './screens/Result'
import Topic from './screens/Topic'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/topic/:topicId" element={<Topic />} />
        <Route path="/quiz/:topicId/:lessonId" element={<Quiz />} />
        <Route path="/quiz/:topicId/:lessonId/result" element={<Result />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
