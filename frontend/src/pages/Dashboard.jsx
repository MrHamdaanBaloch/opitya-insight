import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  Camera, 
  Activity, 
  Shield, 
  Zap, 
  TrendingUp,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { AuthContext } from '../App';
import { toast } from '../hooks/use-toast';
import apiClient from '../lib/apiClient'; // Import the new API client

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [kpis, setKpis] = useState({
    activeCameras: 0,
    totalCameras: 0,
    detectionsToday: 0,
    watchlistHits: 0,
    avgLatency: 0,
  });
  const [recentDetections, setRecentDetections] = useState([]);
  const [cameraStatus, setCameraStatus] = useState([]);
  const [detectionTrends, setDetectionTrends] = useState([]);
  const [detectionTypes, setDetectionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch KPIs
      const kpiData = await apiClient('/dashboard/kpis', { method: 'GET' });
      setKpis(kpiData);

      // Fetch Recent Detections
      const detectionsData = await apiClient('/dashboard/recent-detections', { method: 'GET' });
      setRecentDetections(detectionsData);

      // Fetch Camera Status
      const cameraStatusData = await apiClient('/dashboard/camera-status', { method: 'GET' });
      setCameraStatus(cameraStatusData);

      // Fetch Detection Trends
      const detectionTrendsData = await apiClient('/dashboard/detection-trends', { method: 'GET' });
      setDetectionTrends(detectionTrendsData);

      // Fetch Detection Types
      const detectionTypesData = await apiClient('/dashboard/detection-types', { method: 'GET' });
      setDetectionTypes(detectionTypesData);

    } catch (err) {
      console.error("Dashboard data fetch error:", err);
      setError(err.message);
      // apiClient already handles toast notifications for API errors and network errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]); // Refetch when user changes

  const kpiCards = [
    {
      title: "Active Cameras",
      value: `${kpis.activeCameras}/${kpis.totalCameras}`,
      change: "+2", // Placeholder, ideally from backend
      icon: Camera,
      color: "bg-blue-600"
    },
    {
      title: "Detections Today",
      value: kpis.detectionsToday,
      change: "+12%", // Placeholder, ideally from backend
      icon: Activity,
      color: "bg-green-600"
    },
    {
      title: "Watchlist Hits",
      value: kpis.watchlistHits,
      change: "+3", // Placeholder, ideally from backend
      icon: Shield,
      color: "bg-red-600"
    },
    {
      title: "Avg Latency",
      value: `${kpis.avgLatency}ms`,
      change: "-5ms", // Placeholder, ideally from backend
      icon: Zap,
      color: "bg-purple-600"
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000 / 60); // minutes
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">
          Real-time overview of your ANPR system performance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-200 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  {kpi.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${kpi.color} group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{kpi.value}</div>
                <p className="text-xs text-green-400 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {kpi.change} from yesterday
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Detections */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Detections
            </CardTitle>
            <CardDescription className="text-gray-400">
              Latest vehicle detections across all cameras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-gray-400">Loading recent detections...</p>
              ) : error ? (
                <p className="text-red-400">Error: {error}</p>
              ) : recentDetections.length === 0 ? (
                <p className="text-gray-400">No recent detections.</p>
              ) : (
                recentDetections.slice(0, 5).map((detection) => (
                  <div key={detection.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors duration-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{detection.plate_text}</p>
                        <p className="text-sm text-gray-400">{detection.camera_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-300">{formatTimeAgo(detection.timestamp)}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant={detection.confidence > 90 ? "default" : "secondary"} className="text-xs">
                          {detection.confidence}%
                        </Badge>
                        {detection.is_watchlist_hit && (
                          <Badge variant="destructive" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Alert
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3">
              {loading ? (
                <p className="text-gray-400">Loading recent detections...</p>
              ) : error ? (
                <p className="text-red-400">Error: {error}</p>
              ) : recentDetections.length === 0 ? (
                <p className="text-gray-400">No recent detections.</p>
              ) : (
                recentDetections.slice(0, 5).map((detection) => (
                  <div key={detection.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors duration-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{detection.plate_text}</p>
                        <p className="text-sm text-gray-400">{detection.camera_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-300">{formatTimeAgo(detection.timestamp)}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant={detection.confidence > 90 ? "default" : "secondary"} className="text-xs">
                          {detection.confidence}%
                        </Badge>
                        {detection.is_watchlist_hit && (
                          <Badge variant="destructive" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Alert
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4 border-white/30 text-gray-300 hover:bg-white/10"
              onClick={() => navigate('/app/logs')}
            >
              View All Detections
            </Button>
          </CardContent>
        </Card>

        {/* Camera Status */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Camera Status
            </CardTitle>
            <CardDescription className="text-gray-400">
              Live status of all monitoring cameras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-gray-400">Loading camera status...</p>
              ) : error ? (
                <p className="text-red-400">Error: {error}</p>
              ) : cameraStatus.length === 0 ? (
                <p className="text-gray-400">No cameras found.</p>
              ) : (
                cameraStatus.map((camera) => (
                  <div key={camera.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors duration-200">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(camera.status)}
                      <div>
                        <p className="font-semibold text-white">{camera.name}</p>
                        <p className="text-sm text-gray-400">{camera.site}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={camera.status === 'online' ? 'default' : 'destructive'}
                        className="mb-1"
                      >
                        {camera.status}
                      </Badge>
                      {camera.status === 'online' && (
                        <p className="text-sm text-gray-400">{camera.latency}ms</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4 border-white/30 text-gray-300 hover:bg-white/10"
              onClick={() => navigate('/app/cameras')}
            >
              <Eye className="h-4 w-4 mr-2" />
              View All Cameras
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Trends */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Detection Trends</CardTitle>
            <CardDescription className="text-gray-400">
              Daily detection count over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {loading ? (
                <p className="text-gray-400">Loading detection trends...</p>
              ) : error ? (
                <p className="text-red-400">Error: {error}</p>
              ) : detectionTrends.length === 0 ? (
                <p className="text-gray-400">No detection trends available.</p>
              ) : (
                detectionTrends.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm transition-all duration-500 hover:from-blue-500 hover:to-blue-300"
                      style={{ 
                        height: `${(day.detections / Math.max(...detectionTrends.map(d => d.detections))) * 200}px`,
                        minHeight: '20px'
                      }}
                    />
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                    </p>
                    <p className="text-xs text-white font-medium">{day.detections}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detection Types */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Detection Types</CardTitle>
            <CardDescription className="text-gray-400">
              Breakdown of regular vs watchlist detections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-gray-400">Loading detection types...</p>
              ) : error ? (
                <p className="text-red-400">Error: {error}</p>
              ) : detectionTypes.length === 0 ? (
                <p className="text-gray-400">No detection types available.</p>
              ) : (
                detectionTypes.map((type, index) => {
                  const totalDetections = detectionTypes.reduce((sum, t) => sum + t.value, 0);
                  const percentage = totalDetections > 0 ? (type.value / totalDetections) * 100 : 0;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">{type.name}</span>
                        <span className="text-white font-semibold">{type.value}</span>
                      </div>
                      <div className="w-full bg-black/50 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: type.color 
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">{Math.round(percentage)}% of total</p>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Quick Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-black/30 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-white">
                  {loading ? '...' : kpis.detectionsToday}
                </p>
                <p className="text-xs text-gray-400">Total Today</p>
              </div>
              <div className="bg-black/30 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-400">
                  {loading ? '...' : `${Math.round((detectionTypes.find(t => t.name === 'Watchlist')?.value || 0) / 
                    (detectionTypes.reduce((sum, t) => sum + t.value, 0) || 1) * 100)}%`}
                </p>
                <p className="text-xs text-gray-400">Alert Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
