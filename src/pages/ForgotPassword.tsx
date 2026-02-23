import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft, KeyRound, Lock, CheckCircle } from 'lucide-react';
import { authAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import aseleaLogo from '@/assets/aselea-logo.png';

type Step = 'email' | 'otp' | 'newPassword' | 'success';

const ForgotPassword = () => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Please enter your email'); return; }
    setIsLoading(true);
    try {
      const res = await authAPI.forgotPassword(email);
      const data = res.data as any;
      toast({ title: 'Code Sent', description: data.message || 'Check your email for the reset code' });
      // In dev mode, the backend may return the token directly
      if (data.resetToken) {
        setOtp(data.resetToken);
      }
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset code');
    } finally { setIsLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.length < 6) { setError('Please enter the 6-digit code'); return; }
    setStep('newPassword');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setIsLoading(true);
    try {
      await authAPI.resetPassword(email, otp, newPassword);
      toast({ title: 'Success', description: 'Password reset successfully!' });
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Token may be expired.');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md glass-card fade-in relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={aseleaLogo} alt="Aselea Network" className="h-16 w-auto object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              {step === 'email' && 'Forgot Password'}
              {step === 'otp' && 'Verify Code'}
              {step === 'newPassword' && 'New Password'}
              {step === 'success' && 'Password Reset!'}
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              {step === 'email' && 'Enter your email to receive a reset code'}
              {step === 'otp' && 'Enter the 6-digit code sent to your email'}
              {step === 'newPassword' && 'Create a new password for your account'}
              {step === 'success' && 'Your password has been changed successfully'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="Enter your registered email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="pl-10 bg-secondary border-border" required autoComplete="email" />
                </div>
              </div>
              {error && <div className="text-destructive text-sm text-center bg-destructive/10 py-2 rounded-lg border border-destructive/20">{error}</div>}
              <Button type="submit" className="w-full glow-button" disabled={isLoading}>
                {isLoading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Sending...</span> : 'Send Reset Code'}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp">Reset Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="otp" type="text" placeholder="Enter 6-digit code" maxLength={6}
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="pl-10 bg-secondary border-border text-center text-lg tracking-widest" required />
                </div>
                <p className="text-xs text-muted-foreground">Code sent to {email}. Valid for 10 minutes.</p>
              </div>
              {error && <div className="text-destructive text-sm text-center bg-destructive/10 py-2 rounded-lg border border-destructive/20">{error}</div>}
              <Button type="submit" className="w-full glow-button" disabled={isLoading}>Verify Code</Button>
            </form>
          )}

          {step === 'newPassword' && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="newPassword" type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password (min 6 chars)" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="pl-10 bg-secondary border-border" required minLength={6} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirmPassword" type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm new password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-secondary border-border" required minLength={6} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="showPwd" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} className="rounded" />
                <Label htmlFor="showPwd" className="text-xs text-muted-foreground cursor-pointer">Show passwords</Label>
              </div>
              {error && <div className="text-destructive text-sm text-center bg-destructive/10 py-2 rounded-lg border border-destructive/20">{error}</div>}
              <Button type="submit" className="w-full glow-button" disabled={isLoading}>
                {isLoading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Resetting...</span> : 'Reset Password'}
              </Button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">You can now login with your new password.</p>
              <Button className="w-full glow-button" onClick={() => navigate('/login')}>
                Go to Login
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
