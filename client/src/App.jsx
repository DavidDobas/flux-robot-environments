import { Routes, Route, Link } from 'react-router-dom';
import RobotPage from './pages/RobotPage';
import FluxPage from './pages/FluxPage';

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
              <li>
                <Link to="/flux">Flux Image Editor</Link>
              </li>
            </ul>
          </nav>
        </div>
      } />
      <Route path="/robot" element={<RobotPage />} />
      <Route path="/flux" element={<FluxPage />} />
    </Routes>
  );
}

export default App
