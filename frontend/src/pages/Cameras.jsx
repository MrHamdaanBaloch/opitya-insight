import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  Camera, 
  Plus, 
  Trash2, 
  Eye, 
  Edit, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Activity,
  Clock
} from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient'; // Import the new API client

const Cameras = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false); // New state for edit dialog
  const [newCamera, setNewCamera] = useState({
    name: '',
    rtsp_url: '',
    site: ''
  });
  const [editingCamera, setEditingCamera] = useState(null); // New state for camera being edited

  const fetchCameras = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient('/cameras/', { method: 'GET' });
      setCameras(data);
    } catch (err) {
      console.error("Error fetching cameras:", err);
      setError(err.message);
      // apiClient already handles toast notifications
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = (camera) => {
    setEditingCamera({ ...camera }); // Set the camera to be edited
    setShowEditDialog(true); // Open the edit dialog
  };

  const handleUpdateCamera = async () => {
    if (!editingCamera.name || !editingCamera.rtsp_url) {
      toast({
        title: "Validation Error",
        description: "Please fill in camera name and RTSP URL",
        variant: "destructive"
      });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      logout();
      navigate('/login');
      return;
    }

    try {
      const data = await apiClient(`/cameras/${editingCamera.id}`, {
        method: 'PUT',
        body: {
          name: editingCamera.name,
          rtsp_url: editingCamera.rtsp_url,
          site: editingCamera.site || null
        },
      });

      toast({
        title: "Camera Updated",
        description: `${editingCamera.name} has been successfully updated`
      });
      setEditingCamera(null);
      setShowEditDialog(false);
      fetchCameras(); // Refresh camera list
    } catch (err) {
      console.error("Error updating camera:", err);
      // apiClient already handles toast notifications
    }
  };

  useEffect(() => {
    fetchCameras();
  }, [user, navigate]); // Added navigate to dependencies, though it's stable. User is the key.

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-600';
      case 'offline':
        return 'bg-red-600';
      default:
        return 'bg-yellow-600';
    }
  };

  const handleAddCamera = async () => {
    if (!newCamera.name || !newCamera.rtsp_url) {
      toast({
        title: "Validation Error",
        description: "Please fill in camera name and RTSP URL",
        variant: "destructive"
      });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      logout();
      navigate('/login');
      return;
    }

    try {
      const data = await apiClient('/cameras/', {
        method: 'POST',
        body: {
          name: newCamera.name,
          rtsp_url: newCamera.rtsp_url,
          site: newCamera.site || null // Use null if empty
        },
      });

      toast({
        title: "Camera Added",
        description: `${newCamera.name} has been successfully added`
      });
      setNewCamera({ name: '', rtsp_url: '', site: '' });
      setShowAddDialog(false);
      fetchCameras(); // Refresh camera list
    } catch (err) {
      console.error("Error adding camera:", err);
      // apiClient already handles toast notifications
    }
  };

  const handleDeleteCamera = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      logout();
      navigate('/login');
      return;
    }

    try {
      await apiClient(`/cameras/${id}`, {
        method: 'DELETE',
      });

      setCameras(prevCameras => prevCameras.filter(camera => camera.id !== id)); // Immediately update UI
      toast({
        title: "Camera Deleted",
        description: "Camera has been successfully removed"
      });
      fetchCameras(); // Refresh camera list to ensure full synchronization
    } catch (err) {
      console.error("Error deleting camera:", err);
      // apiClient already handles toast notifications, so no need to add another here.
    }
  };

  const formatLastSeen = (timestamp) => {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Cameras</h1>
          <p className="text-gray-400">Manage and monitor your ANPR cameras</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button type="button" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Camera
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Camera</DialogTitle>
              <DialogDescription className="text-gray-400">
                Configure a new ANPR camera for monitoring
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-camera-name" className="text-white">Camera Name</Label>
                <Input
                  id="add-camera-name"
                  placeholder="e.g. Main Gate"
                  value={newCamera.name}
                  onChange={(e) => setNewCamera({...newCamera, name: e.target.value})}
                  className="bg-black/50 border-white/30 text-white"
                  type="text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-rtsp-url" className="text-white">RTSP URL</Label>
                <Input
                  id="add-rtsp-url"
                  placeholder="rtsp://192.168.1.100/stream1"
                  value={newCamera.rtsp_url}
                  onChange={(e) => setNewCamera({...newCamera, rtsp_url: e.target.value})}
                  className="bg-black/50 border-white/30 text-white"
                  type="text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-location" className="text-white">Location (Optional)</Label>
                <Input
                  id="add-location"
                  placeholder="e.g. Building A - Main Entrance"
                  value={newCamera.site}
                  onChange={(e) => setNewCamera({...newCamera, site: e.target.value})}
                  className="bg-black/50 border-white/30 text-white"
                  type="text"
                />
              </div>
              <div className="flex space-x-2 pt-4">
                <Button type="button" onClick={handleAddCamera} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Add Camera
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1 border-white/30 text-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Camera Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="bg-gray-900 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Camera</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update the configuration for {editingCamera?.name}
              </DialogDescription>
            </DialogHeader>
            {editingCamera && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-camera-name" className="text-white">Camera Name</Label>
                  <Input
                    id="edit-camera-name"
                    placeholder="e.g. Main Gate"
                    value={editingCamera.name}
                    onChange={(e) => setEditingCamera({...editingCamera, name: e.target.value})}
                    className="bg-black/50 border-white/30 text-white"
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-rtsp-url" className="text-white">RTSP URL</Label>
                  <Input
                    id="edit-rtsp-url"
                    placeholder="rtsp://192.168.1.100/stream1"
                    value={editingCamera.rtsp_url}
                    onChange={(e) => setEditingCamera({...editingCamera, rtsp_url: e.target.value})}
                    className="bg-black/50 border-white/30 text-white"
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-location" className="text-white">Location (Optional)</Label>
                  <Input
                    id="edit-location"
                    placeholder="e.g. Building A - Main Entrance"
                    value={editingCamera.site}
                    onChange={(e) => setEditingCamera({...editingCamera, site: e.target.value})}
                    className="bg-black/50 border-white/30 text-white"
                    type="text"
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button type="button" onClick={handleUpdateCamera} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    Save Changes
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setShowEditDialog(false)}
                    className="flex-1 border-white/30 text-gray-300"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Camera Stats */}
      {loading ? (
        <p className="text-gray-400">Loading camera stats...</p>
      ) : error ? (
        <p className="text-red-400">Error: {error}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">{cameras.length}</p>
                  <p className="text-sm text-gray-400">Total Cameras</p>
                </div>
                <Camera className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    {cameras.filter(c => c.status === 'online').length}
                  </p>
                  <p className="text-sm text-gray-400">Online</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-400">
                    {cameras.filter(c => c.status === 'offline').length}
                  </p>
                  <p className="text-sm text-gray-400">Offline</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {cameras.length > 0 ? Math.round(cameras.reduce((sum, c) => sum + (c.health || 0), 0) / cameras.length) : 0}%
                  </p>
                  <p className="text-sm text-gray-400">Avg Health</p>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-gray-400">Loading cameras...</p>
        ) : error ? (
          <p className="text-red-400">Error: {error}</p>
        ) : cameras.length === 0 ? (
          <div className="p-12 text-center text-gray-500 lg:col-span-3">
            <Camera className="h-16 w-16 mx-auto mb-4" />
            <p className="text-lg font-semibold">No cameras added yet</p>
            <p className="text-sm">Click "Add Camera" to get started</p>
          </div>
        ) : (
          cameras.map((camera) => (
            <Card key={camera.id} className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-200 group">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center">
                    {getStatusIcon(camera.status)}
                    <span className="ml-2">{camera.name}</span>
                  </CardTitle>
                  <Badge className={`${getStatusColor(camera.status)} text-white`}>
                    {camera.status}
                  </Badge>
                </div>
                <CardDescription className="text-gray-400">
                  {camera.site || 'Unknown Location'}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {/* Camera Preview Placeholder */}
                <div className="aspect-video bg-black/50 rounded-lg mb-4 flex items-center justify-center border-2 border-dashed border-gray-600 group-hover:border-gray-500 transition-colors">
                  <div className="text-center text-gray-400">
                    <Camera className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Camera Feed</p>
                    {camera.status === 'offline' && (
                      <p className="text-xs text-red-400 mt-1">No Signal</p>
                    )}
                  </div>
                </div>
                
                {/* Camera Stats */}
                {camera.status === 'online' && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-black/30 p-3 rounded-lg">
                      <p className="text-xs text-gray-400">Latency</p>
                      <p className="text-sm font-semibold text-white">{camera.latency || 0}ms</p>
                    </div>
                    <div className="bg-black/30 p-3 rounded-lg">
                      <p className="text-xs text-gray-400">Health</p>
                      <p className="text-sm font-semibold text-white">{camera.health || 0}%</p>
                    </div>
                  </div>
                )}
                
                {/* Last Seen */}
                <div className="flex items-center text-sm text-gray-400 mb-4">
                  <Clock className="h-4 w-4 mr-2" />
                  Last seen: {camera.last_seen ? formatLastSeen(camera.last_seen) : 'N/A'}
                </div>
                
                {/* Actions */}
                <div className="flex space-x-2">
                  <Button 
                    type="button"
                    size="sm" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={camera.status === 'offline'}
                    onClick={() => navigate(`/app/live/${camera.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Live
                  </Button>
                  <Button 
                    type="button"
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleOpenEditDialog(camera)}
                    className="border-white/30 text-gray-300 hover:bg-white/10"
                    aria-label={`Edit camera ${camera.name}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    type="button"
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDeleteCamera(camera.id)}
                    className="border-red-500/50 text-red-400 hover:bg-red-600/20"
                    aria-label={`Delete camera ${camera.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Cameras;
