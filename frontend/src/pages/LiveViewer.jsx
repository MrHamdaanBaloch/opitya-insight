import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { 
  Camera, 
  Download, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Settings,
  Zap,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { AuthContext } from '../App';
import apiClient from '../lib/apiClient'; // Import the new API client

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

const LiveViewer = () => {
  const { cameraId: paramCameraId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(paramCameraId || '');
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [liveDetections, setLiveDetections] = useState([]);
  const [latestFrame, setLatestFrame] = useState('');
  const [streamStatus, setStreamStatus] = useState('Connecting...');
  const [streamLatency, setStreamLatency] = useState(0); // Placeholder for now
  const [streamHealth, setStreamHealth] = useState(0); // Placeholder for now
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const fetchCameras = async () => {
    try {
      const data = await apiClient('/cameras/', { method: 'GET' });
      setCameras(data);
      if (data.length > 0 && !selectedCameraId) {
        setSelectedCameraId(data[0].id.toString());
      }
    } catch (err) {
      console.error("Error fetching cameras:", err);
      // apiClient already handles toast notifications
    }
  };

  useEffect(() => {
    fetchCameras();
  }, [user]);

  useEffect(() => {
    console.log('LiveViewer: useEffect for selectedCameraId/cameras triggered. selectedCameraId:', selectedCameraId, 'Cameras count:', cameras.length);
    if (selectedCameraId && cameras.length > 0) {
      const camera = cameras.find(c => c.id.toString() === selectedCameraId);
      console.log('LiveViewer: Found camera:', camera?.name);
      setSelectedCamera(camera);
      if (camera) {
        navigate(`/app/live/${camera.id}`, { replace: true });
      }
    } else {
      console.log('LiveViewer: No camera found or selectedCameraId/cameras not ready. Setting selectedCamera to null.');
      setSelectedCamera(null);
    }
  }, [selectedCameraId, cameras]);

  useEffect(() => {
    console.log('LiveViewer: useEffect for selectedCamera triggered. Current selectedCamera:', selectedCamera?.name);

    // If no camera is selected, ensure WebSocket is closed and clear state
    if (!selectedCamera) {
      console.log('LiveViewer: No camera selected. Closing WebSocket if open.');
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setStreamStatus('No Camera Selected');
      setLatestFrame('');
      setLiveDetections([]);
      setError(null); // Clear any errors
      return;
    }

    setStreamStatus('Connecting...');
    setLatestFrame('');
    setLiveDetections([]);
    setError(null); // Clear previous errors

    const token = localStorage.getItem('token');
    if (!token) {
      logout();
      navigate('/login');
      return;
    }

    let reconnectTimeout;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 10;
    const INITIAL_RECONNECT_INTERVAL = 1000; // 1 second
    let isCurrentEffectRun = true; // Flag to ensure callbacks only act for the current effect run, moved here
    let ws = null; // Declare ws here, in the useEffect's scope

    const connectWebSocket = () => {
      // Close any existing WebSocket before creating a new one for the new camera
      if (wsRef.current) {
        console.log('LiveViewer: Closing existing WebSocket before new connection.');
        wsRef.current.close();
        wsRef.current = null;
      }

      setStreamStatus('Connecting...');
      setError(null); // Clear previous errors

      ws = new WebSocket(`${WS_URL}/ws/streams/${selectedCamera.id}?token=${token}`); // Assign to the outer ws

      ws.onopen = () => {
        if (isCurrentEffectRun) {
          console.log(`WebSocket connected for camera ${selectedCamera.name}. Assigning to wsRef.current.`);
          setStreamStatus('Live');
          wsRef.current = ws; // Assign to ref only on successful open
          reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        } else {
          console.log('WebSocket opened but this effect run is no longer active, closing immediately.');
          ws.close();
        }
      };

      ws.onmessage = (event) => {
        if (!isCurrentEffectRun) return;
        const data = JSON.parse(event.data);
        console.log("WebSocket data received:", data); // Log incoming data for debugging

        if (data.image) {
          setLatestFrame(`data:image/jpeg;base64,${data.image}`);
        }
        if (data.plates) {
          setLiveDetections(prev => {
            const uniquePlateNumbers = new Set(prev.map(d => d.plateNumber));
            const newDetections = data.plates
              .filter(plate => !uniquePlateNumbers.has(plate.plate_text)) // Filter out duplicates
              .map(plate => ({
                id: Date.now() + Math.random(), // Unique ID for React key
                plateNumber: plate.plate_text,
                timestamp: new Date().toISOString(),
                confidence: plate.confidence,
                isWatchlisted: plate.is_watchlist_hit,
                // Coordinates are not used for rendering bounding boxes anymore, but kept for data consistency
                x: plate.x || 0,
                y: plate.y || 0,
                width: plate.width || 0,
                height: plate.height || 0
              }));
            
            // Keep a maximum of 8 recent unique detections for the sidebar
            const combinedDetections = [...prev, ...newDetections];
            return combinedDetections.slice(Math.max(combinedDetections.length - 8, 0));
          });

          data.plates.forEach(plate => {
            if (plate.is_watchlist_hit) {
              toast({
                title: "🚨 Watchlist Alert",
                description: `Vehicle ${plate.plate_text} detected on ${selectedCamera.name}`,
                variant: "destructive"
              });
            }
          });
        }
        if (data.error) {
          setError(data.error);
          setStreamStatus('Error');
          toast({
            title: "Stream Error",
            description: data.error,
            variant: "destructive"
          });
        }
      };

      ws.onclose = (event) => {
        if (!isCurrentEffectRun) return;
        console.log(`WebSocket disconnected for camera ${selectedCamera.name}: Code=${event.code}, Reason=${event.reason}, WasClean=${event.wasClean}`);
        setStreamStatus('Disconnected');
        if (wsRef.current === ws) {
          console.log('onclose: Nullifying wsRef.current.');
          wsRef.current = null;
        }

        if (!event.wasClean && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const reconnectInterval = INITIAL_RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts);
          console.log(`Attempting to reconnect in ${reconnectInterval / 1000} seconds (attempt ${reconnectAttempts + 1})...`);
          toast({
            title: "Stream Disconnected",
            description: `WebSocket closed unexpectedly. Attempting to reconnect in ${reconnectInterval / 1000}s...`,
            variant: "destructive"
          });
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            connectWebSocket();
          }, reconnectInterval);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          const errorMessage = `WebSocket closed unexpectedly: ${event.reason || 'Unknown error'}. Max reconnect attempts reached.`;
          setError(errorMessage);
          toast({
            title: "Stream Disconnected",
            description: errorMessage,
            variant: "destructive"
          });
        } else {
          // Clean close
          setError(null);
        }
      };

      ws.onerror = (err) => {
        if (!isCurrentEffectRun) return;
        console.error(`WebSocket error for camera ${selectedCamera.name}:`, err);
        setError('WebSocket error during connection or runtime.');
        setStreamStatus('Error');
        if (wsRef.current === ws) {
          console.log('onerror: Closing WebSocket due to error.');
          ws.close();
          console.log('onerror: Nullifying wsRef.current.');
          wsRef.current = null;
        }
        toast({
          title: "Stream Error",
          description: "WebSocket connection error. Attempting to reconnect...",
          variant: "destructive"
        });
        // The onclose handler will trigger reconnection if needed
      };
    }; // End of connectWebSocket function

    // Initial connection attempt
    connectWebSocket();

    return () => {
      console.log('LiveViewer useEffect cleanup: Marking effect run as inactive and closing its WebSocket if still active.');
      isCurrentEffectRun = false;
      clearTimeout(reconnectTimeout); // Clear any pending reconnection attempts

      // Always close the WebSocket stored in the ref if it exists
      if (wsRef.current) {
        console.log('LiveViewer useEffect cleanup: Closing wsRef.current.');
        wsRef.current.close();
        wsRef.current = null; // Explicitly nullify the ref
      }
    };
  }, [selectedCamera, logout, navigate]);

  const handleSnapshot = async () => {
    if (!selectedCamera) return;
    try {
      const data = await apiClient(`/cameras/${selectedCamera.id}/snapshot`, {
        method: 'POST',
      });
      toast({
        title: "Snapshot Captured",
        description: `Image saved from ${selectedCamera.name}. URL: ${data.image_url}`
      });
    } catch (err) {
      console.error("Error capturing snapshot:", err);
      // apiClient already handles toast notifications
    }
  };

  const handleRefresh = () => {
    console.log('handleRefresh called.');
    if (selectedCamera) {
      if (wsRef.current) {
        console.log('handleRefresh: Closing existing WebSocket.');
        wsRef.current.close();
      }
      // Re-trigger useEffect to reconnect WebSocket
      setSelectedCameraId(selectedCamera.id.toString()); 
      toast({
        title: "Stream Refreshed",
        description: "Live stream has been refreshed"
      });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Live Viewer</h1>
          <p className="text-gray-400">Real-time camera monitoring and detection overlay</p>
        </div>
        
        {/* Camera Selector */}
        <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
          <SelectTrigger className="w-64 bg-black/50 border-white/30 text-white">
            <SelectValue placeholder="Select camera" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-white/30">
            {cameras.map((camera) => (
              <SelectItem 
                key={camera.id} 
                value={camera.id.toString()} 
                className="text-white focus:bg-white/10"
              >
                <div className="flex items-center">
                  {camera.status === 'online' ? 
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" /> : 
                    <div className="h-4 w-4 bg-red-500 rounded-full mr-2" />
                  }
                  {camera.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Video Feed */}
        <div className="lg:col-span-3">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  {selectedCamera?.name || 'Select Camera'}
                  {selectedCamera?.status === 'online' && (
                    <Badge className="ml-3 bg-green-600">Live</Badge>
                  )}
                </CardTitle>
                
                {/* Controls */}
                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowOverlays(!showOverlays)}
                    className="border-white/30 text-gray-300"
                  >
                    {showOverlays ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleRefresh}
                    className="border-white/30 text-gray-300"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleSnapshot}
                    className="border-white/30 text-gray-300"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={toggleFullscreen}
                    className="border-white/30 text-gray-300"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                {selectedCamera ? (
                  selectedCamera.status === 'online' ? (
                    <>
                      {latestFrame ? (
                        <div className="relative w-full h-full">
                          <img src={latestFrame} alt="Live Stream" className="w-full h-full object-contain" />
                          {/* Stream Info Overlay */}
                          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white">
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                                REC
                              </div>
                              <div className="flex items-center">
                                <Zap className="h-4 w-4 mr-1 text-green-400" />
                                {streamLatency}ms
                              </div>
                              <div>
                                {new Date().toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                          <div className="text-center text-gray-400">
                            <Camera className="h-16 w-16 mx-auto mb-4" />
                            <p className="text-lg font-semibold">Waiting for stream...</p>
                            <p className="text-sm">Camera: {selectedCamera.name}</p>
                            <p className="text-xs mt-2">Status: {streamStatus}</p>
                            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <div className="text-center text-gray-500">
                        <Camera className="h-16 w-16 mx-auto mb-4" />
                        <p className="text-lg font-semibold">Camera Offline</p>
                        <p className="text-sm">No video signal available</p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <div className="text-center text-gray-500">
                      <Camera className="h-16 w-16 mx-auto mb-4" />
                      <p className="text-lg font-semibold">Select a Camera</p>
                      <p className="text-sm">Choose a camera from the dropdown above</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Stream Stats */}
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="bg-black/30 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-white">{liveDetections.length}</p>
                  <p className="text-xs text-gray-400">Active Detections</p>
                </div>
                <div className="bg-black/30 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {liveDetections.filter(d => d.confidence > 90).length}
                  </p>
                  <p className="text-xs text-gray-400">High Confidence</p>
                </div>
                <div className="bg-black/30 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-400">
                    {liveDetections.filter(d => d.isWatchlisted).length}
                  </p>
                  <p className="text-xs text-gray-400">Watchlist Hits</p>
                </div>
                <div className="bg-black/30 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {selectedCamera?.health || 0}%
                  </p>
                  <p className="text-xs text-gray-400">Stream Health</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Recent Detections */}
        <div className="lg:col-span-1">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Recent Detections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {liveDetections.slice().reverse().slice(0, 8).map((detection) => (
                  <div key={detection.id} className="p-3 bg-black/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white text-sm">{detection.plateNumber || 'N/A'}</span>
                      {detection.isWatchlisted && (
                        <Badge variant="destructive" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Alert
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      <p>Confidence: {typeof detection.confidence === 'number' ? detection.confidence : 'N/A'}%</p>
                      <p>{new Date(detection.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                
                {liveDetections.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Camera className="h-12 w-12 mx-auto mb-3" />
                    <p className="text-sm">No recent detections</p>
                    <p className="text-xs">Waiting for vehicles...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveViewer;
