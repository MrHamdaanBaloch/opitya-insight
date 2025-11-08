import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Edit, 
  Mail, 
  Phone, 
  AlertTriangle,
  Upload,
  Download
} from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient'; // Import the new API client

const Watchlist = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    plate: '',
    label: '',
    notify_sms: false,
    notify_email: true
  });
  const [editingEntry, setEditingEntry] = useState(null); // For edit functionality

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient('/watchlist/', { method: 'GET' });
      setWatchlist(data);
    } catch (err) {
      console.error("Error fetching watchlist:", err);
      setError(err.message);
      // apiClient already handles toast notifications
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.plate) {
      toast({
        title: "Validation Error",
        description: "Please enter a plate number",
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
      const data = await apiClient('/watchlist/', {
        method: 'POST',
        body: {
          plate_text: newEntry.plate.toUpperCase(), // Changed from 'plate' to 'plate_text'
          description: newEntry.label || "", // Changed from 'label' to 'description'
          notify_sms: newEntry.notify_sms,
          notify_email: newEntry.notify_email,
        },
      });

      toast({
        title: "Entry Added",
        description: `${newEntry.plate} has been added to watchlist`
      });
      setNewEntry({ plate: '', label: '', notify_sms: false, notify_email: true });
      setShowAddDialog(false);
      fetchWatchlist(); // Refresh watchlist
    } catch (err) {
      console.error("Error adding watchlist entry:", err);
      // apiClient already handles toast notifications
    }
  };

  const handleDeleteEntry = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      logout();
      navigate('/login');
      return;
    }

    try {
      await apiClient(`/watchlist/${id}`, {
        method: 'DELETE',
      });

      setWatchlist(prevWatchlist => prevWatchlist.filter(entry => entry.id !== id)); // Immediately update UI
      toast({
        title: "Entry Removed",
        description: "Watchlist entry has been successfully removed"
      });
      fetchWatchlist(); // Refresh watchlist to ensure full synchronization
    } catch (err) {
      console.error("Error deleting watchlist entry:", err);
      // apiClient already handles toast notifications
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntry({
      ...entry,
      notify_sms: entry.notify_sms,
      notify_email: entry.notify_email,
    });
    setShowAddDialog(true); // Reuse add dialog for editing
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry.plate) {
      toast({
        title: "Validation Error",
        description: "Please enter a plate number",
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
      await apiClient(`/watchlist/${editingEntry.id}`, {
        method: 'PUT',
        body: {
          plate_text: editingEntry.plate.toUpperCase(), // Changed from 'plate' to 'plate_text'
          description: editingEntry.label || "", // Changed from 'label' to 'description'
          notify_sms: editingEntry.notify_sms,
          notify_email: editingEntry.notify_email,
        },
      });

      toast({
        title: "Entry Updated",
        description: `${editingEntry.plate} has been successfully updated`
      });
      setEditingEntry(null);
      setShowAddDialog(false);
      fetchWatchlist(); // Refresh watchlist
    } catch (err) {
      console.error("Error updating watchlist entry:", err);
      // apiClient already handles toast notifications
    }
  };

  const toggleNotification = async (id, type, currentValue) => {
    const token = localStorage.getItem('token');
    if (!token) {
      logout();
      navigate('/login');
      return;
    }

    const entryToUpdate = watchlist.find(entry => entry.id === id);
    if (!entryToUpdate) return;

    const updatedValue = !currentValue; 

    try {
      await apiClient(`/watchlist/${id}`, {
        method: 'PUT',
        body: {
          plate_text: entryToUpdate.plate_text, // Changed from entryToUpdate.plate to entryToUpdate.plate_text
          description: entryToUpdate.description, // Changed from entryToUpdate.label to entryToUpdate.description
          notify_sms: type === 'notify_sms' ? updatedValue : entryToUpdate.notify_sms,
          notify_email: type === 'notify_email' ? updatedValue : entryToUpdate.notify_email,
        },
      });

      toast({
        title: "Notification Updated",
        description: `Notification setting for ${entryToUpdate.plate} updated`
      });
      fetchWatchlist(); // Refresh watchlist
    } catch (err) {
      console.error("Error updating notification:", err);
      // apiClient already handles toast notifications
    }
  };

  const handleBulkImport = () => {
    toast({
      title: "Import Started",
      description: "CSV import functionality would be implemented here"
    });
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: `Exporting ${watchlist.length} watchlist entries`
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Watchlist</h1>
          <p className="text-gray-400">Manage vehicle watchlist and alert settings</p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={handleBulkImport} 
            variant="outline"
            className="border-white/30 text-gray-300 hover:bg-white/10"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button 
            onClick={handleExport} 
            variant="outline"
            className="border-white/30 text-gray-300 hover:bg-white/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              setEditingEntry(null); // Clear editing state when dialog closes
              setNewEntry({ plate: '', label: '', notify_sms: false, notify_email: true }); // Reset new entry state
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-white/20">
              <DialogHeader>
                <DialogTitle className="text-white">{editingEntry ? "Edit Watchlist Entry" : "Add Watchlist Entry"}</DialogTitle>
                <DialogDescription className="text-gray-400">
                  {editingEntry ? "Edit the vehicle plate and monitoring settings" : "Add a vehicle plate to the monitoring watchlist"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plate" className="text-white">Plate Number</Label>
                  <Input
                    id="plate"
                    placeholder="e.g. ABC123"
                    value={editingEntry ? editingEntry.plate : newEntry.plate}
                    onChange={(e) => editingEntry ? setEditingEntry({...editingEntry, plate: e.target.value}) : setNewEntry({...newEntry, plate: e.target.value})}
                    className="bg-black/50 border-white/30 text-white uppercase"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="label" className="text-white">Label/Description</Label>
                  <Input
                    id="label"
                    placeholder="e.g. Stolen Vehicle, VIP Guest"
                    value={editingEntry ? editingEntry.label : newEntry.label}
                    onChange={(e) => editingEntry ? setEditingEntry({...editingEntry, label: e.target.value}) : setNewEntry({...newEntry, label: e.target.value})}
                    className="bg-black/50 border-white/30 text-white"
                  />
                </div>
                
                {/* Removed Priority Level as it's not in backend schema */}
                
                <div className="space-y-4">
                  <Label className="text-white">Notification Settings</Label>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-white">Email Notifications</span>
                    </div>
                    <Switch
                      checked={editingEntry ? editingEntry.notify_email : newEntry.notify_email}
                      onCheckedChange={(checked) => editingEntry ? setEditingEntry({...editingEntry, notify_email: checked}) : setNewEntry({...newEntry, notify_email: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-white">SMS Notifications</span>
                    </div>
                    <Switch
                      checked={editingEntry ? editingEntry.notify_sms : newEntry.notify_sms}
                      onCheckedChange={(checked) => editingEntry ? setEditingEntry({...editingEntry, notify_sms: checked}) : setNewEntry({...newEntry, notify_sms: checked})}
                    />
                  </div>
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button 
                    onClick={editingEntry ? handleUpdateEntry : handleAddEntry} 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {editingEntry ? "Update Entry" : "Add to Watchlist"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddDialog(false);
                      setEditingEntry(null); // Clear editing state on cancel
                    }}
                    className="flex-1 border-white/30 text-gray-300"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{watchlist.length}</p>
                <p className="text-sm text-gray-400">Total Entries</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-400">
                  {/* Replaced priority filter with a check for any notifications enabled */}
                  {watchlist.filter(e => e.notify_email || e.notify_sms).length}
                </p>
                <p className="text-sm text-gray-400">Alerts Enabled</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-400">
                  {watchlist.filter(e => e.notify_email).length}
                </p>
                <p className="text-sm text-gray-400">Email Alerts</p>
              </div>
              <Mail className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-400">
                  {watchlist.filter(e => e.notify_sms).length}
                </p>
                <p className="text-sm text-gray-400">SMS Alerts</p>
              </div>
              <Phone className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Watchlist Table */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Watchlist Entries</CardTitle>
          <CardDescription className="text-gray-400">
            Manage plate numbers and notification settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/20">
                <tr className="text-left">
                  <th className="p-4 text-white font-medium">Plate Number</th>
                  <th className="p-4 text-white font-medium">Label</th>
                  {/* Removed Priority column header */}
                  <th className="p-4 text-white font-medium">Notifications</th>
                  <th className="p-4 text-white font-medium">Added Date</th>
                  <th className="p-4 text-white font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((entry) => (
                  <tr 
                    key={entry.id} 
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-semibold text-white text-lg">
                        {entry.plate_text} {/* Changed from entry.plate to entry.plate_text */}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-white">{entry.description}</span> {/* Changed from entry.label to entry.description */}
                    </td>
                    {/* Removed Priority Badge */}
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant={entry.notify_email ? "default" : "outline"}
                          onClick={() => toggleNotification(entry.id, 'notify_email', entry.notify_email)}
                          className={entry.notify_email ? 
                            "bg-green-600 hover:bg-green-700 h-8" : 
                            "border-white/30 text-gray-400 hover:bg-white/10 h-8"
                          }
                        >
                          <Mail className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={entry.notify_sms ? "default" : "outline"}
                          onClick={() => toggleNotification(entry.id, 'notify_sms', entry.notify_sms)}
                          className={entry.notify_sms ? 
                            "bg-blue-600 hover:bg-blue-700 h-8" : 
                            "border-white/30 text-gray-400 hover:bg-white/10 h-8"
                          }
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-300">{formatDate(entry.created_at)}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditEntry(entry)}
                          className="border-white/30 text-gray-300 hover:bg-white/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="border-red-500/50 text-red-400 hover:bg-red-600/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {watchlist.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Shield className="h-16 w-16 mx-auto mb-4" />
              <p className="text-lg font-semibold">No watchlist entries</p>
              <p className="text-sm">Add your first entry to start monitoring</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Watchlist;
