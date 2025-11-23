import { Routes, Route, Link } from 'react-router-dom';
import RobotPage from './pages/RobotPage';
import FluxPage from './pages/FluxPage';
import CapturesPage from './pages/CapturesPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ marginBottom: '30px' }}>Flux Robot Environments</h1>
          <nav>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '15px' }}>
                <Link 
                  to="/robot"
                  style={{
                    display: 'block',
                    padding: '15px 20px',
                    background: '#2196F3',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    transition: 'background 0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1976D2'}
                  onMouseLeave={(e) => e.target.style.background = '#2196F3'}
                >
                  View Robot
                </Link>
              </li>
              <li style={{ marginBottom: '15px' }}>
                <Link 
                  to="/captures"
                  style={{
                    display: 'block',
                    padding: '15px 20px',
                    background: '#4CAF50',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    transition: 'background 0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#388E3C'}
                  onMouseLeave={(e) => e.target.style.background = '#4CAF50'}
                >
                  View Captures
                </Link>
              </li>
              <li style={{ marginBottom: '15px' }}>
                <Link 
                  to="/flux"
                  style={{
                    display: 'block',
                    padding: '15px 20px',
                    background: '#FF9800',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    transition: 'background 0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#F57C00'}
                  onMouseLeave={(e) => e.target.style.background = '#FF9800'}
                >
                  Flux Image Editor
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      } />
      <Route path="/robot" element={<RobotPage />} />
      <Route path="/captures" element={<CapturesPage />} />
      <Route path="/flux" element={<FluxPage />} />
    </Routes>
  );
}

export default App
