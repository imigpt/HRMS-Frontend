import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Download,
  Eye,
  Loader2,
  Upload,
  MapPin,
} from 'lucide-react';
import { policyAPI } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PolicyFile {
  url: string;
  publicId: string;
  originalName: string;
  mimeType: string;
}

interface Policy {
  _id: string;
  title: string;
  description: string;
  location: string;
  file?: PolicyFile;
  createdBy: { name: string; email: string };
  createdAt: string;
}

const CompanyPolicies = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = userRole === 'admin';

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', location: 'Head Office' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // View dialog
  const [viewPolicy, setViewPolicy] = useState<Policy | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await policyAPI.getPolicies();
      setPolicies(res.data?.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load policies',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // ── Add ───────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Validation', description: 'Title is required', variant: 'destructive' });
      return;
    }
    try {
      setAddLoading(true);
      const data = new FormData();
      data.append('title', form.title.trim());
      data.append('description', form.description.trim());
      data.append('location', form.location.trim() || 'Head Office');
      if (selectedFile) data.append('file', selectedFile);
      await policyAPI.createPolicy(data);
      toast({ title: 'Success', description: 'Policy added successfully' });
      setAddOpen(false);
      setForm({ title: '', description: '', location: 'Head Office' });
      setSelectedFile(null);
      fetchPolicies();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add policy',
        variant: 'destructive',
      });
    } finally {
      setAddLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleteLoading(true);
      await policyAPI.deletePolicy(deleteId);
      toast({ title: 'Success', description: 'Policy deleted' });
      setDeleteId(null);
      fetchPolicies();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete policy',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async (policy: Policy) => {
    if (!policy.file?.url) {
      toast({ title: 'No File', description: 'This policy has no attached file', variant: 'destructive' });
      return;
    }
    try {
      // Fetch via axios so the JWT token is sent, then turn the response into a blob URL
      const res = await policyAPI.downloadFile(policy._id);
      const blob = new Blob([res.data], {
        type: policy.file.mimeType || res.headers['content-type'] || 'application/octet-stream',
      });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = policy.file.originalName || policy.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Release memory
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error.response?.data?.message || 'Could not download file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const filteredPolicies = policies.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Company Policies
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isAdmin
                ? 'Manage and publish company policies'
                : 'View and download company policies'}
            </p>
          </div>
          {isAdmin && (
            <Button className="glow-button" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
          )}
        </div>

        {/* ── Table Card ── */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base">All Policies</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title…"
                  className="pl-9 bg-secondary border-border"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPolicies.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No policies found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-[45%]">Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPolicies.map((policy) => (
                    <TableRow key={policy._id} className="border-border hover:bg-secondary/30">
                      <TableCell>
                        <button
                          className="text-primary font-medium hover:underline text-left"
                          onClick={() => setViewPolicy(policy)}
                        >
                          {policy.title}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          {policy.location || 'Head Office'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(policy.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuItem
                              onClick={() => setViewPolicy(policy)}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {policy.file?.url && (
                              <DropdownMenuItem
                                onClick={() => handleDownload(policy)}
                                className="cursor-pointer"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download File
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() => setDeleteId(policy._id)}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Policy
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Add Policy Dialog (admin only) ── */}
        <Dialog
          open={addOpen}
          onOpenChange={(o) => {
            if (!addLoading) {
              setAddOpen(o);
              if (!o) { setForm({ title: '', description: '', location: 'Head Office' }); setSelectedFile(null); }
            }
          }}
        >
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add Company Policy</DialogTitle>
              <DialogDescription>
                Fill in the details and optionally attach a document.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="pol-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pol-title"
                  placeholder="e.g. Work From Home Policy"
                  className="bg-secondary border-border"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pol-location">Location</Label>
                <Input
                  id="pol-location"
                  placeholder="e.g. Head Office"
                  className="bg-secondary border-border"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pol-desc">Description</Label>
                <Textarea
                  id="pol-desc"
                  placeholder="Brief description of this policy…"
                  className="bg-secondary border-border min-h-[80px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Attach Document <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <div
                  className="border border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-secondary/40 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  {selectedFile ? (
                    <p className="text-sm text-primary truncate max-w-full px-2">{selectedFile.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to upload PDF, Word or text file</p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={addLoading}
              >
                Cancel
              </Button>
              <Button className="glow-button" onClick={handleAdd} disabled={addLoading}>
                {addLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Policy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── View Policy Dialog ── */}
        <Dialog open={!!viewPolicy} onOpenChange={() => setViewPolicy(null)}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {viewPolicy?.title}
              </DialogTitle>
              <DialogDescription asChild>
                <span className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {viewPolicy?.location || 'Head Office'}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {viewPolicy?.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {viewPolicy.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Added by{' '}
                <span className="font-medium text-foreground">
                  {viewPolicy?.createdBy?.name}
                </span>{' '}
                on{' '}
                {viewPolicy
                  ? new Date(viewPolicy.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : ''}
              </p>
              {viewPolicy?.file?.url ? (
                <Button
                  className="w-full glow-button"
                  onClick={() => viewPolicy && handleDownload(viewPolicy)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download {viewPolicy.file.originalName || 'Document'}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-2">
                  No document attached to this policy
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirm ── */}
        <AlertDialog
          open={!!deleteId}
          onOpenChange={(o) => {
            if (!o) setDeleteId(null);
          }}
        >
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Policy?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the policy and its attached file. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default CompanyPolicies;
