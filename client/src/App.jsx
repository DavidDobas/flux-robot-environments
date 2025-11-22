import { Routes, Route, Link } from 'react-router-dom';
import RobotPage from './pages/RobotPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={
        <div>
          <h1>Flux Robot Environments</h1>
          <nav>
            <ul>
              <li>
                <Link to="/robot">View Robot</Link>
              </li>
            </ul>
          </nav>
        </div>
      } />
      <Route path="/robot" element={<RobotPage />} />
    </Routes>
  );
}

export default App
