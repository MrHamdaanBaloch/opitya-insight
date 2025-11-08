import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  Camera,
  Shield,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient'; // Import the new API client

const Logs = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [cameras, setCameras] = useState([]); // For camera filter dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCameraId, setSelectedCameraId] = useState('all');
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [confidenceRange, setConfidenceRange] = useState([0]);
  const [selectedImageLog, setSelectedImageLog] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const logsPerPage = 10; // Matches backend default limit

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    // No need to check token here, apiClient handles it
    // No need for explicit logout/navigate on 401 here, apiClient handles it

    const queryParams = {
      page: currentPage,
      per_page: logsPerPage,
    };
    if (searchTerm) queryParams.plate = searchTerm;
    if (selectedCameraId !== 'all') queryParams.camera_id = selectedCameraId;
    if (showWatchlistOnly) queryParams.watchlist_only = 'true';
    if (confidenceRange[0] > 0) queryParams.min_confidence = confidenceRange[0];
    // Add date filters if implemented

    try {
      const data = await apiClient('/logs/', {
        method: 'GET',
        params: queryParams, // Pass query parameters
      });
      setLogs(data.items);
      setTotalLogs(data.total);
    } catch (err) {
      // apiClient already shows toast, just set local error state if needed
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCamerasForFilter = async () => {
    try {
      const data = await apiClient('/cameras/', { method: 'GET' });
      setCameras(data);
    } catch (err) {
      // apiClient already shows toast, just set local error state if needed
      console.error("Error fetching cameras for filter:", err);
    }
  };

  useEffect(() => {
    fetchCamerasForFilter();
  }, [user]);

  useEffect(() => {
    fetchLogs();
  }, [user, searchTerm, selectedCameraId, showWatchlistOnly, confidenceRange, currentPage]);

  const handleExport = async (format) => {
    const queryParams = { format };
    if (searchTerm) queryParams.plate = searchTerm;
    if (selectedCameraId !== 'all') queryParams.camera_id = selectedCameraId;
    if (showWatchlistOnly) queryParams.watchlist_only = 'true';
    if (confidenceRange[0] > 0) queryParams.min_confidence = confidenceRange[0];

    try {
      // Use apiClient for consistency and centralized error handling
      const response = await apiClient(`/logs/export?${new URLSearchParams(queryParams).toString()}`, {
        method: 'GET',
        responseType: 'blob', // Indicate that the response is a blob, not JSON
      });

      // apiClient will handle errors and toasts, so if we get here, it's a success
      if (!response) { // apiClient returns null for 204, but export should return a blob
        throw new Error("Export failed: No content received.");
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plate_logs.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Started",
        description: `Exporting logs as ${format.toUpperCase()}`
      });
    } catch (err) {
      console.error("Error exporting logs:", err);
      toast({
        title: "Export Failed",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'bg-green-600';
    if (confidence >= 70) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= Math.ceil(totalLogs / logsPerPage)) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Detection Logs</h1>
          <p className="text-gray-400">Search and export detection records</p>
        </div>
        
        {/* Export Buttons */}
        <div className="flex space-x-2">
          <Button 
            onClick={() => handleExport('csv')} 
            variant="outline"
            className="border-white/30 text-gray-300 hover:bg-white/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={() => handleExport('pdf')} 
            variant="outline"
            className="border-white/30 text-gray-300 hover:bg-white/10"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
          <CardDescription className="text-gray-400">
            Filter detection records by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search by Plate */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Search Plate Number</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Enter plate number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-black/50 border-white/30 text-white"
                />
              </div>
            </div>

            {/* Camera Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Camera</label>
              <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
                <SelectTrigger className="bg-black/50 border-white/30 text-white">
                  <SelectValue placeholder="All cameras" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/30">
                  <SelectItem value="all" className="text-white">All Cameras</SelectItem>
                  {cameras.map((camera) => (
                    <SelectItem 
                      key={camera.id} 
                      value={camera.id.toString()} 
                      className="text-white"
                    >
                      {camera.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Confidence Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Min Confidence: {confidenceRange[0]}%
              </label>
              <Slider
                value={confidenceRange}
                onValueChange={setConfidenceRange}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Watchlist Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Filter Options</label>
              <div className="space-y-2">
                <Button
                  onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
                  variant={showWatchlistOnly ? "default" : "outline"}
                  size="sm"
                  className={showWatchlistOnly ? 
                    "bg-red-600 hover:bg-red-700" : 
                    "border-white/30 text-gray-300 hover:bg-white/10"
                  }
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Watchlist Only
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {loading ? (
        <p className="text-gray-400">Loading summary...</p>
      ) : error ? (
        <p className="text-red-400">Error: {error}</p>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-gray-400">
            Showing {logs.length} of {totalLogs} detection records
          </p>
        </div>
      )}

      {/* Detection Table */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/20">
                <tr className="text-left">
                  <th className="p-4 text-white font-medium">Plate Number</th>
                  <th className="p-4 text-white font-medium">Timestamp</th>
                  <th className="p-4 text-white font-medium">Camera</th>
                  <th className="p-4 text-white font-medium">Confidence</th>
                  <th className="p-4 text-white font-medium">Status</th>
                  <th className="p-4 text-white font-medium">Image</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-gray-400">Loading logs...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-red-400">Error: {error}</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-gray-500">No detection records found. Try adjusting your search filters.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr 
                      key={log.id} 
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-semibold text-white">
                          {log.plate_text}
                        </span>
                        {/* Vehicle type is not in backend schema currently */}
                        {/* <div className="text-xs text-gray-400 capitalize">
                          {log.vehicleType}
                        </div> */}
                      </td>
                      <td className="p-4">
                        <div className="text-white">
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <Camera className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-white">
                            {cameras.find(c => c.id === log.camera_id)?.name || 'Unknown Camera'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={`${getConfidenceColor(log.confidence)} text-white`}>
                          {log.confidence}%
                        </Badge>
                      </td>
                      <td className="p-4">
                        {log.is_watchlist_hit ? ( // Assuming backend provides this
                          <Badge variant="destructive" className="text-white">
                            <Shield className="h-3 w-3 mr-1" />
                            Watchlist
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-600 text-white">
                            Normal
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedImageLog(log)}
                              className="border-white/30 text-gray-300 hover:bg-white/10"
                              disabled={!log.image_snapshot_ref}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900 border-white/20 max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-white">Detection Image</DialogTitle>
                              <DialogDescription className="text-gray-400">
                                {selectedImageLog?.plate_text} - {cameras.find(c => c.id === selectedImageLog?.camera_id)?.name || 'Unknown Camera'}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                                {selectedImageLog?.image_snapshot_ref ? (
                                  <img 
                                    src={selectedImageLog.image_snapshot_ref} 
                                    alt="Detection Snapshot" 
                                    className="max-h-full max-w-full object-contain" 
                                  />
                                ) : (
                                  <div className="text-center text-gray-400">
                                    <ImageIcon className="h-16 w-16 mx-auto mb-4" />
                                    <p>No Image Available</p>
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/30 p-3 rounded-lg">
                                  <p className="text-xs text-gray-400">Detection Time</p>
                                  <p className="text-sm text-white">{formatTimestamp(selectedImageLog?.timestamp)}</p>
                                </div>
                                <div className="bg-black/30 p-3 rounded-lg">
                                  <p className="text-xs text-gray-400">Confidence Score</p>
                                  <p className="text-sm text-white">{selectedImageLog?.confidence}%</p>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalLogs > 0 && (
        <div className="flex items-center justify-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-white/30 text-gray-300"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-gray-400 text-sm">
            Page {currentPage} of {Math.ceil(totalLogs / logsPerPage)}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-white/30 text-gray-300"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === Math.ceil(totalLogs / logsPerPage)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default Logs;
