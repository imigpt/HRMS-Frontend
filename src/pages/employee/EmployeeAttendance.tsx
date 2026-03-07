import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Clock,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  FileText,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  CircleDot,
  Send,
  Loader2,
  MapPin,
  Camera,
  Image,
  X,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import { attendanceAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { validateFaceFromDataUrl } from '@/utils/faceDetection';
import BODDialog from '@/components/attendance/BODDialog';
import EODDialog from '@/components/attendance/EODDialog';

interface TodayAttendance {
  _id?: string;
  checkIn?: {
    time?: string;
    location?: { latitude: number; longitude: number; address?: string };
    photo?: { url: string; publicId: string; capturedAt: string };
    similarityScore?: number | null;
  };
  checkOut?: {
    time?: string;
    location?: { latitude: number; longitude: number; address?: string };
  };
  status: 'present' | 'absent' | 'late' | 'on-leave' | 'half-day';
  workHours?: number;
}

interface DailyAttendance {
  _id: string;
  date: string;
  checkIn?: {
    time?: string;
    location?: { latitude: number; longitude: number; address?: string };
    photo?: { url: string; publicId: string; capturedAt: string };
  };
  checkOut?: {
    time?: string;
    location?: { latitude: number; longitude: number; address?: string };
  };
  status: 'present' | 'absent' | 'late' | 'on-leave' | 'half-day';
  workHours?: number;
}

const EmployeeAttendance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [loading, setLoading] = useState(true);
  const [punchingIn, setPunchingIn] = useState(false);
  const [punchingOut, setPunchingOut] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [monthAttendance, setMonthAttendance] = useState<DailyAttendance[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DailyAttendance | null>(null);
  const [editFormData, setEditFormData] = useState({
    punchIn: '',
    punchOut: '',
    reason: '',
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Half-day request state (moved to Leave page)
  
  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedPhotoFile, setCapturedPhotoFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Selfie status: tracks the client-side face detection/upload lifecycle
  const [selfieStatus, setSelfieStatus] = useState<'not-captured' | 'validating' | 'captured' | 'failed'>('not-captured');

  // Photo preview state
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  // BOD / EOD dialog state
  const [showBODDialog, setShowBODDialog] = useState(false);
  const [showEODDialog, setShowEODDialog] = useState(false);
  // When true, BOD was opened from the Check In button — submit BOD then trigger check-in
  const [pendingCheckIn, setPendingCheckIn] = useState(false);

  // Re-verification retake state (post check-in, after face verification fails)
  const [isReVerification, setIsReVerification] = useState(false);
  const [reVerifLoading, setReVerifLoading] = useState(false);

  // Face verification status
  const [faceVerifStatus, setFaceVerifStatus] = useState<'idle' | 'pending' | 'verified' | 'failed'>('idle');
  const faceVerifPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faceVerifPollCountRef = useRef(0);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (faceVerifPollRef.current) clearInterval(faceVerifPollRef.current);
    };
  }, []);

  // Effect to attach stream to video when modal opens
  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [showCamera]);
  
  useEffect(() => {
    fetchTodayAttendance();
    fetchMonthAttendance();
  }, [selectedYear, selectedMonth]);

  const fetchTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getToday();
      const todayRec = response.data.data;
      setTodayAttendance(todayRec);

      // Restore face verification status from previously-saved data (on page load)
      if (todayRec?.checkIn?.similarityScore !== undefined && todayRec.checkIn.similarityScore !== null) {
        setFaceVerifStatus(todayRec.checkIn.similarityScore >= 55 ? 'verified' : 'failed');
      }

      // Merge into monthAttendance so the calendar shows today's status immediately
      if (todayRec && todayRec.date) {
        const recDate = new Date(todayRec.date);
        if (recDate.getFullYear() === selectedYear && recDate.getMonth() === selectedMonth) {
          setMonthAttendance(prev => {
            // Replace existing record for today or prepend if not present
            const filtered = prev.filter(r => {
              if (!r || !r.date) return true;
              const d = new Date(r.date);
              return !(
                d.getFullYear() === recDate.getFullYear() &&
                d.getMonth() === recDate.getMonth() &&
                d.getDate() === recDate.getDate()
              );
            });
            return [todayRec, ...filtered];
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch today attendance:', error);
      // If no attendance for today, that's okay - user hasn't checked in yet
      if (error.response?.status !== 404) {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to load today\'s attendance',
          variant: 'destructive',
        });
      }
    }
  };

  const fetchMonthAttendance = async () => {
    try {
      setLoading(true);
      const startDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0).toISOString();
      // End of the last day of the month (23:59:59.999) so today's records are included
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).toISOString();
      
      const response = await attendanceAPI.getMyAttendance({ 
        startDate,
        endDate,
      });
      setMonthAttendance(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch attendance:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load attendance records',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // Camera functions
  const startCamera = async () => {
    // Guard: profile photo is required for face verification
    if (!user?.profilePhoto?.url) {
      toast({
        title: 'Profile Photo Required',
        description: 'You must upload a profile photo before checking in so your identity can be verified.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // First show the modal so video element is in DOM
      setShowCamera(true);
      
      // Small delay to ensure video element is rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }
    } catch (error) {
      console.error('Camera error:', error);
      setShowCamera(false);
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please allow camera permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setIsReVerification(false);
  }, []);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Check if video is ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast({
        title: 'Camera Loading',
        description: 'Please wait for camera to initialize...',
        variant: 'default',
      });
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror horizontally so the captured image matches the mirrored preview
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg');

    // Run client-side face detection before accepting the photo
    setSelfieStatus('validating');
    toast({ title: 'Validating', description: 'Checking for face in captured photo…' });

    const faceResult = await validateFaceFromDataUrl(dataUrl);

    if (!faceResult.valid) {
      setSelfieStatus('failed');
      toast({
        title: 'Selfie Rejected',
        description: faceResult.reason,
        variant: 'destructive',
      });
      // Keep camera open so user can retake immediately
      return;
    }

    // Valid face detected — accept photo
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `checkin-${Date.now()}.jpg`, { type: 'image/jpeg' });

      if (isReVerification) {
        // Re-verification flow: submit to backend synchronously
        stopCamera();
        setIsReVerification(false);
        setReVerifLoading(true);
        setFaceVerifStatus('pending');
        try {
          const res = await attendanceAPI.resubmitSelfie(file);
          const { matched, similarityScore, message } = res.data;
          if (matched) {
            setFaceVerifStatus('verified');
            toast({ title: '✓ Face Verified', description: message });
          } else {
            setFaceVerifStatus('failed');
            toast({ title: 'Face Verification Failed', description: message, variant: 'destructive' });
          }
        } catch (err: any) {
          setFaceVerifStatus('failed');
          toast({
            title: 'Re-verification Failed',
            description: err.response?.data?.message || 'Could not process selfie. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setReVerifLoading(false);
        }
        return;
      }

      // Normal check-in selfie flow
      setCapturedPhotoFile(file);
      setCapturedPhoto(dataUrl);
      setSelfieStatus('captured');
      stopCamera();
      toast({
        title: 'Selfie Captured',
        description: 'Selfie uploaded successfully. You may now check in.',
      });
    }, 'image/jpeg', 0.8);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setCapturedPhotoFile(null);
    setSelfieStatus('not-captured');
    startCamera();
  };

  const startReVerification = () => {
    setIsReVerification(true);
    startCamera();
  };

  const openPhotoPreview = (photoUrl: string) => {
    setPhotoPreviewUrl(photoUrl);
    setShowPhotoPreview(true);
  };

  const handlePunchIn = async () => {
    try {
      setPunchingIn(true);
      let location;
      
      try {
        location = await getLocation();
        toast({
          title: 'Location captured',
          description: 'Your check-in location has been recorded',
        });
      } catch (error) {
        console.error('Location error:', error);
        toast({
          title: 'Warning',
          description: 'Could not get location, proceeding without it',
          variant: 'destructive',
        });
      }

      // Call API with photo if captured
      await attendanceAPI.checkIn(location, capturedPhotoFile || undefined);
      
      toast({
        title: 'Checked In',
        description: 'Check-in successful! Face verification is processing in the background.',
      });
      
      // Reset camera state
      setCapturedPhoto(null);
      setCapturedPhotoFile(null);
      setSelfieStatus('not-captured');

      // Fetch month first so full list is loaded, then merge today's record on top
      await fetchMonthAttendance();
      await fetchTodayAttendance();

      // Start polling for face verification result (async background job)
      setFaceVerifStatus('pending');
      if (faceVerifPollRef.current) clearInterval(faceVerifPollRef.current);
      faceVerifPollCountRef.current = 0;
      faceVerifPollRef.current = setInterval(async () => {
        faceVerifPollCountRef.current += 1;
        // Timeout after ~30 seconds (10 attempts × 3s)
        if (faceVerifPollCountRef.current > 10) {
          clearInterval(faceVerifPollRef.current!);
          faceVerifPollRef.current = null;
          return;
        }
        try {
          const res = await attendanceAPI.getToday();
          const rec = res.data.data;
          if (rec?.checkIn?.similarityScore !== undefined && rec.checkIn.similarityScore !== null) {
            clearInterval(faceVerifPollRef.current!);
            faceVerifPollRef.current = null;
            const score: number = rec.checkIn.similarityScore;
            if (score >= 55) {
              setFaceVerifStatus('verified');
              toast({
                title: '✓ Face Verified',
                description: `Identity confirmed — ${score.toFixed(1)}% match with your profile photo.`,
              });
            } else {
              setFaceVerifStatus('failed');
              toast({
                title: 'Face Verification Failed',
                description: `Selfie did not match your profile photo (${score.toFixed(1)}% similarity). Contact HR if this is an error.`,
                variant: 'destructive',
              });
            }
          }
        } catch {
          // Silent — will retry on next interval
        }
      }, 3000);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to check in',
        variant: 'destructive',
      });
    } finally {
      setPunchingIn(false);
    }
  };

  const handlePunchOut = async () => {
    try {
      setPunchingOut(true);
      
      let location;
      try {
        location = await getLocation();
      } catch (error) {
        console.error('Location error:', error);
      }
      
      await attendanceAPI.checkOut(location);
      toast({
        title: 'Success',
        description: 'Checked out successfully!',
      });
      // Fetch month first so full list is loaded, then merge today's record on top
      await fetchMonthAttendance();
      await fetchTodayAttendance();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to check out',
        variant: 'destructive',
      });
    } finally {
      setPunchingOut(false);
    }
  };
  
  // Calculate stats for current month
  const stats = {
    present: monthAttendance.filter(d => d.status === 'present').length,
    late: monthAttendance.filter(d => d.status === 'late').length,
    absent: monthAttendance.filter(d => d.status === 'absent').length,
    leave: monthAttendance.filter(d => d.status === 'on-leave').length,
    halfday: monthAttendance.filter(d => d.status === 'half-day').length,
  };
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };
  
  const handleToday = () => {
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };
  
  const getCalendarDays = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const days: Array<{ day: number; attendance: DailyAttendance | null }> = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, attendance: null });
    }
    
    // Add actual days with attendance records matched by date
    for (let day = 1; day <= daysInMonth; day++) {
      const attendanceRecord = monthAttendance.find(record => {
        if (!record || !record.date) return false;
        const recordDate = new Date(record.date);
        return (
          recordDate.getFullYear() === selectedYear &&
          recordDate.getMonth() === selectedMonth &&
          recordDate.getDate() === day
        );
      });
      days.push({ day, attendance: attendanceRecord || null });
    }
    
    return days;
  };
  
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'present':
        return 'bg-success/20 border-success/40 text-success';
      case 'late':
        return 'bg-warning/20 border-warning/40 text-warning';
      case 'absent':
        return 'bg-destructive/20 border-destructive/40 text-destructive';
      case 'on-leave':
        return 'bg-primary/20 border-primary/40 text-primary';
      case 'half-day':
        return 'bg-orange-500/20 border-orange-500/40 text-orange-400';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };
  
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'present':
        return <Badge className="status-approved">Present</Badge>;
      case 'late':
        return <Badge className="status-pending">Late</Badge>;
      case 'absent':
        return <Badge className="status-rejected">Absent</Badge>;
      case 'on-leave':
        return <Badge className="status-in-progress">Leave</Badge>;
      case 'half-day':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40">Half Day</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };
  
  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const openEditDialog = (record: DailyAttendance) => {
    setSelectedRecord(record);
    const checkInTime = record.checkIn?.time ? new Date(record.checkIn.time) : null;
    const checkOutTime = record.checkOut?.time ? new Date(record.checkOut.time) : null;
    
    setEditFormData({
      punchIn: checkInTime ? `${String(checkInTime.getHours()).padStart(2, '0')}:${String(checkInTime.getMinutes()).padStart(2, '0')}` : '',
      punchOut: checkOutTime ? `${String(checkOutTime.getHours()).padStart(2, '0')}:${String(checkOutTime.getMinutes()).padStart(2, '0')}` : '',
      reason: '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitEditRequest = async () => {
    if (!selectedRecord || !editFormData.reason || !editFormData.punchIn || !editFormData.punchOut) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    
    if (editFormData.reason.length < 10) {
      toast({
        title: 'Error',
        description: 'Reason must be at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmittingEdit(true);
      
      // Build full datetime from record date + requested time
      const recordDate = new Date(selectedRecord.date);
      const [inHours, inMins] = editFormData.punchIn.split(':');
      const [outHours, outMins] = editFormData.punchOut.split(':');
      
      const requestedCheckIn = new Date(recordDate);
      requestedCheckIn.setHours(parseInt(inHours), parseInt(inMins), 0, 0);
      
      const requestedCheckOut = new Date(recordDate);
      requestedCheckOut.setHours(parseInt(outHours), parseInt(outMins), 0, 0);
      
      await attendanceAPI.createEditRequest({
        attendanceId: selectedRecord._id,
        requestedCheckIn: requestedCheckIn.toISOString(),
        requestedCheckOut: requestedCheckOut.toISOString(),
        reason: editFormData.reason,
      });
      
      toast({
        title: 'Success',
        description: 'Edit request submitted! HR will review your request.',
      });
      
      setIsEditDialogOpen(false);
      setSelectedRecord(null);
      setEditFormData({ punchIn: '', punchOut: '', reason: '' });
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit edit request',
        variant: 'destructive',
      });
    } finally {
      setSubmittingEdit(false);
    }
  };
  
  // Half-day request handling moved to LeaveModule

  // Helper variables for checked in/out status
  const hasCheckedIn = !!todayAttendance?.checkIn?.time;
  const hasCheckedOut = !!todayAttendance?.checkOut?.time;

  // Format time helper
  const formatTime = (timeValue: string | undefined) => {
    if (!timeValue) return '-';
    return new Date(timeValue).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format work hours
  const formatDuration = (workHours: number | undefined) => {
    if (!workHours) return '-';
    const hours = Math.floor(workHours);
    const minutes = Math.round((workHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  const downloadAttendanceCSV = () => {
    if (!monthAttendance || monthAttendance.length === 0) {
      toast({ title: 'No records', description: 'No attendance records to export' });
      return;
    }

    const rows: Array<string[]> = [];
    rows.push(['Date', 'Check In', 'Check Out', 'Status', 'Work Hours', 'Check-in Photo']);

    monthAttendance.forEach((rec) => {
      const date = rec.date ? new Date(rec.date).toLocaleDateString() : '';
      const checkIn = rec.checkIn?.time ? new Date(rec.checkIn.time).toLocaleTimeString() : '';
      const checkOut = rec.checkOut?.time ? new Date(rec.checkOut.time).toLocaleTimeString() : '';
      const status = rec.status || '';
      const workHours = rec.workHours ? formatDuration(rec.workHours) : '';
      const photo = rec.checkIn?.photo?.url || '';
      rows.push([date, checkIn, checkOut, status, workHours, photo]);
    });

    const csv = rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* BOD Dialog — required before check-in */}
        <BODDialog
          open={showBODDialog}
          onClose={() => {
            setShowBODDialog(false);
            setPendingCheckIn(false);
          }}
          onSubmit={() => {
            setShowBODDialog(false);
            if (pendingCheckIn) {
              setPendingCheckIn(false);
              handlePunchIn();
            }
          }}
        />

        {/* EOD Dialog — shown before check-out */}
        <EODDialog
          open={showEODDialog}
          onClose={() => setShowEODDialog(false)}
          onConfirm={() => {
            setShowEODDialog(false);
            handlePunchOut();
          }}
        />

        {/* Camera Modal */}
        <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
          <DialogContent className="glass-card max-w-md">
            <DialogHeader>
              <DialogTitle>Take Selfie for Check-in</DialogTitle>
              <DialogDescription>
                Position your face clearly in the frame and click capture. Only one face should be visible.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
              <canvas ref={canvasRef} className="hidden" />
              {selfieStatus === 'validating' && (
                <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Detecting face…
                </div>
              )}
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={stopCamera}>
                  Cancel
                </Button>
                <Button className="glow-button" onClick={capturePhoto} disabled={selfieStatus === 'validating'}>
                  <Camera className="h-4 w-4 mr-2" />
                  {selfieStatus === 'failed' ? 'Retry Capture' : 'Capture Selfie'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Photo Preview Modal */}
        <Dialog open={showPhotoPreview} onOpenChange={setShowPhotoPreview}>
          <DialogContent className="glass-card max-w-lg">
            <DialogHeader>
              <DialogTitle>Check-in Photo</DialogTitle>
            </DialogHeader>
            {photoPreviewUrl && (
              <div className="rounded-lg overflow-hidden">
                <img 
                  src={photoPreviewUrl} 
                  alt="Check-in photo" 
                  className="w-full h-auto"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Top Status Banner */}
        <Card className="glass-card border-primary/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  hasCheckedIn ? 'bg-success/20' : 'bg-destructive/20'
                }`}>
                  {hasCheckedIn ? (
                    <CheckCircle className="h-8 w-8 text-success" />
                  ) : (
                    <Clock className="h-8 w-8 text-destructive" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {hasCheckedOut ? 'Day Complete' : hasCheckedIn ? 'Checked In' : 'Not Checked In'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {hasCheckedIn 
                      ? `Check in: ${formatTime(todayAttendance?.checkIn?.time)}${hasCheckedOut ? ` • Check out: ${formatTime(todayAttendance?.checkOut?.time)}` : ' • Today'}`
                      : capturedPhoto 
                        ? 'Photo captured! Click "Confirm Check In" to proceed'
                        : user?.profilePhoto?.url
                          ? 'Take a selfie photo to mark attendance'
                          : 'Upload a profile photo first to enable face verification check-in'}
                  </p>
                  {hasCheckedOut && todayAttendance?.workHours && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {formatDuration(todayAttendance.workHours)}
                    </p>
                  )}
                  {/* Face verification status badge */}
                  {hasCheckedIn && faceVerifStatus !== 'idle' && (
                    <div className="mt-2">
                      {faceVerifStatus === 'pending' && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Face Verification Pending…
                        </Badge>
                      )}
                      {faceVerifStatus === 'verified' && (
                        <Badge className="bg-success/20 text-success border-success/40 gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Face Verified
                        </Badge>
                      )}
                      {faceVerifStatus === 'failed' && (
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge className="bg-destructive/20 text-destructive border-destructive/40 gap-1">
                          <ShieldX className="h-3 w-3" />
                          Face Verification Failed
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                          onClick={startReVerification}
                          disabled={reVerifLoading}
                        >
                          {reVerifLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Camera className="h-3 w-3 mr-1" />}
                          Retake Selfie
                        </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selfie status label (pre-check-in) */}
                  {!hasCheckedIn && (
                    <div className="mt-2">
                      {selfieStatus === 'not-captured' && (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <Camera className="h-3 w-3" />
                          Selfie: Not Captured
                        </Badge>
                      )}
                      {selfieStatus === 'validating' && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Selfie: Validating…
                        </Badge>
                      )}
                      {selfieStatus === 'captured' && (
                        <Badge className="bg-success/20 text-success border-success/40 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Selfie: Verified
                        </Badge>
                      )}
                      {selfieStatus === 'failed' && (
                        <Badge className="bg-destructive/20 text-destructive border-destructive/40 gap-1">
                          <XCircle className="h-3 w-3" />
                          Selfie: Failed
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {/* Upload profile photo prompt if missing */}
                {!hasCheckedIn && !user?.profilePhoto?.url && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-warning text-warning hover:bg-warning/10"
                    onClick={() => navigate('/employee/profile')}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Upload Profile Photo
                  </Button>
                )}

                {/* Take Selfie button — shown when no photo captured yet */}
                {!hasCheckedIn && !capturedPhoto && selfieStatus !== 'validating' && (
                  <Button className="glow-button" size="lg" onClick={startCamera}>
                    <Camera className="h-4 w-4 mr-2" />
                    Take Selfie
                  </Button>
                )}

                {/* Recapture Selfie — shown when face validation failed (camera still open) */}
                {!hasCheckedIn && selfieStatus === 'failed' && showCamera && (
                  <Button variant="outline" size="lg" onClick={capturePhoto}>
                    <Camera className="h-4 w-4 mr-2" />
                    Retry Capture
                  </Button>
                )}

                {/* Show captured photo preview + recapture option */}
                {capturedPhoto && !hasCheckedIn && (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <img 
                        src={capturedPhoto} 
                        alt="Captured" 
                        className="h-12 w-12 rounded-lg object-cover border-2 border-success"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-white rounded-full p-0"
                        onClick={retakePhoto}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-success">Selfie ready</span>
                      <Button variant="ghost" size="sm" className="h-5 px-1 text-xs text-muted-foreground" onClick={retakePhoto}>
                        Recapture Selfie
                      </Button>
                    </div>
                  </div>
                )}

                {/* Check In Button - Only enabled after selfie is captured & validated */}
                {!hasCheckedIn && (
                  <Button 
                    className="glow-button"
                    size="lg"
                    onClick={() => { setPendingCheckIn(true); setShowBODDialog(true); }}
                    disabled={punchingIn || selfieStatus !== 'captured'}
                  >
                    {punchingIn && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <LogIn className="h-4 w-4 mr-2" />
                    Check In
                  </Button>
                )}

                {/* Check Out Button */}
                {hasCheckedIn && !hasCheckedOut && (
                  <Button 
                    className="bg-destructive hover:bg-destructive/90"
                    size="lg"
                    onClick={() => setShowEODDialog(true)}
                    disabled={punchingOut}
                  >
                    {punchingOut && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <LogOut className="h-4 w-4 mr-2" />
                    Check Out
                  </Button>
                )}
                
                <Button variant="outline" size="lg" className="glass-card" onClick={() => navigate('/employee/leave')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Apply Leave
                </Button>
                {/* Apply Half Day moved to the Leave page */}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.present}</p>
                  <p className="text-xs text-muted-foreground">Present</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.late}</p>
                  <p className="text-xs text-muted-foreground">Late</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.absent}</p>
                  <p className="text-xs text-muted-foreground">Absent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <CircleDot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.leave}</p>
                  <p className="text-xs text-muted-foreground">Leave</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.halfday}</p>
                  <p className="text-xs text-muted-foreground">Half Day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Card */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Attendance Calendar
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Select 
                    value={selectedMonth.toString()} 
                    onValueChange={(val) => setSelectedMonth(parseInt(val))}
                  >
                    <SelectTrigger className="w-[130px] bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedYear.toString()} 
                    onValueChange={(val) => setSelectedYear(parseInt(val))}
                  >
                    <SelectTrigger className="w-[100px] bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="secondary" size="sm" onClick={handleToday}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadAttendanceCSV()}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="space-y-3">
              {/* Week Days Header */}
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {getCalendarDays().map((dayData, idx) => {
                  if (dayData.day === 0) {
                    return <div key={`empty-${idx}`} className="h-14" />;
                  }
                  
                  const currentDate = new Date(selectedYear, selectedMonth, dayData.day);
                  const isTodayDay = isToday(currentDate.toISOString());
                  const attendance = dayData.attendance;
                  
                  return (
                    <div
                      key={`day-${dayData.day}`}
                      className={`
                        h-14 rounded-lg border-2 p-1.5 flex flex-col items-center justify-center
                        transition-all duration-200 hover:scale-105 cursor-pointer
                        ${isTodayDay ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                        ${getStatusColor(attendance?.status || null)}
                      `}
                    >
                      <span className="text-xs font-semibold">{dayData.day}</span>
                      {attendance?.status && (
                        <div className="mt-0.5">
                          {attendance.status === 'present' && <CheckCircle className="h-2.5 w-2.5" />}
                          {attendance.status === 'late' && <AlertCircle className="h-2.5 w-2.5" />}
                          {attendance.status === 'absent' && <XCircle className="h-2.5 w-2.5" />}
                          {attendance.status === 'on-leave' && <CircleDot className="h-2.5 w-2.5" />}
                          {attendance.status === 'half-day' && <CheckCircle className="h-2.5 w-2.5" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Attendance Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Daily Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      <th className="text-left p-4 text-sm font-semibold text-foreground">Date</th>
                      <th className="text-left p-4 text-sm font-semibold text-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-foreground">Check In</th>
                      <th className="text-left p-4 text-sm font-semibold text-foreground">Check Out</th>
                      <th className="text-left p-4 text-sm font-semibold text-foreground">Duration</th>
                      <th className="text-left p-4 text-sm font-semibold text-foreground">Photo</th>
                      <th className="text-left p-4 text-sm font-semibold text-foreground">Check In Location</th>
                      <th className="text-left p-4 text-sm font-semibold text-foreground">Check Out Location</th>
                      <th className="text-left p-4 text-sm font-semibold text-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">Loading attendance records...</p>
                        </td>
                      </tr>
                    ) : monthAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-muted-foreground">
                          No attendance records found for this month
                        </td>
                      </tr>
                    ) : (
                      [...monthAttendance].reverse().map((record) => {
                      const date = new Date(record.date);
                      const formattedDate = date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      });
                      
                      return (
                        <tr key={record._id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                          <td className="p-4 text-sm text-muted-foreground">{formattedDate}</td>
                          <td className="p-4">{getStatusBadge(record.status)}</td>
                          <td className="p-4 text-sm">
                            <span className="text-foreground font-medium">
                              {formatTime(record.checkIn?.time)}
                            </span>
                          </td>
                          <td className="p-4 text-sm">
                            <span className="text-foreground font-medium">
                              {formatTime(record.checkOut?.time)}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-foreground font-medium">
                            {formatDuration(record.workHours)}
                          </td>
                          <td className="p-4 text-sm">
                            {record.checkIn?.photo?.url ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openPhotoPreview(record.checkIn!.photo!.url)}
                                className="text-primary hover:text-primary/80"
                              >
                                <Image className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4 text-sm">
                            {record.checkIn?.location ? (
                              <a
                                href={`https://www.google.com/maps?q=${record.checkIn.location.latitude},${record.checkIn.location.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                                title="View check-in location on Google Maps"
                              >
                                <MapPin className="h-4 w-4" />
                                <span className="underline">View</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4 text-sm">
                            {record.checkOut?.location ? (
                              <a
                                href={`https://www.google.com/maps?q=${record.checkOut.location.latitude},${record.checkOut.location.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                                title="View check-out location on Google Maps"
                              >
                                <MapPin className="h-4 w-4" />
                                <span className="underline">View</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            {['present', 'late', 'half-day'].includes(record.status) ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => openEditDialog(record)}
                                title="Request attendance edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Attendance Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="glass-card max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Attendance Edit</DialogTitle>
              <DialogDescription>
                Submit a request to edit your check in/out times for{' '}
                {selectedRecord && new Date(selectedRecord.date).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Original Times */}
              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-foreground">Current Record:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Check In: </span>
                    <span className="text-foreground font-medium">
                      {selectedRecord?.checkIn?.time 
                        ? formatTime(selectedRecord.checkIn.time) 
                        : 'Not recorded'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Check Out: </span>
                    <span className="text-foreground font-medium">
                      {selectedRecord?.checkOut?.time 
                        ? formatTime(selectedRecord.checkOut.time) 
                        : 'Not recorded'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Requested Times */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="punchIn">Corrected Check In Time <span className="text-destructive">*</span></Label>
                  <Input
                    id="punchIn"
                    type="time"
                    className="bg-secondary border-border"
                    value={editFormData.punchIn}
                    onChange={(e) => setEditFormData({ ...editFormData, punchIn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="punchOut">Corrected Check Out Time <span className="text-destructive">*</span></Label>
                  <Input
                    id="punchOut"
                    type="time"
                    className="bg-secondary border-border"
                    value={editFormData.punchOut}
                    onChange={(e) => setEditFormData({ ...editFormData, punchOut: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Edit Request <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="reason"
                    placeholder="Explain why you need to edit this attendance record (minimum 10 characters)"
                    className="bg-secondary border-border min-h-[100px]"
                    value={editFormData.reason}
                    onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {editFormData.reason.length}/10 characters minimum
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="glow-button"
                onClick={handleSubmitEditRequest}
                disabled={submittingEdit || !editFormData.reason || editFormData.reason.length < 10 || !editFormData.punchIn || !editFormData.punchOut}
              >
                {submittingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Half Day Request moved to Leave page */}
      </div>
    </DashboardLayout>
  );
};

export default EmployeeAttendance;
