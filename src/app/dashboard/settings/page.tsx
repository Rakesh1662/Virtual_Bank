
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/auth-context';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Schemas for the forms
const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email(),
  address: z.string().min(10, { message: 'Address must be at least 10 characters.' }),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Please enter your current password." }),
  newPassword: z.string().min(6, { message: 'New password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match.",
  path: ['confirmPassword'],
});

const mpinFormSchema = z.object({
    currentMpin: z.string().regex(/^\d{4}$/, { message: 'Current MPIN must be a 4-digit number.' }),
    newMpin: z.string().regex(/^\d{4}$/, { message: 'New MPIN must be a 4-digit number.' }),
    confirmMpin: z.string().regex(/^\d{4}$/, { message: 'Confirm MPIN must be a 4-digit number.' }),
}).refine((data) => data.newMpin === data.confirmMpin, {
    message: "New MPINs don't match.",
    path: ['confirmMpin'],
});


export default function SettingsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isMpinSubmitting, setIsMpinSubmitting] = useState(false);
  
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Initialize forms
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      address: '',
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mpinForm = useForm<z.infer<typeof mpinFormSchema>>({
    resolver: zodResolver(mpinFormSchema),
    defaultValues: { currentMpin: '', newMpin: '', confirmMpin: '' },
  });

  // Populate form with user data from context
  useEffect(() => {
    if (userData) {
      profileForm.reset({
        fullName: userData.fullName || '',
        email: userData.email || '',
        address: userData.address || '',
      });
    }
  }, [userData, profileForm]);

  // Handlers
  async function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
    if (!user || !db) return;
    setIsProfileSubmitting(true);
    try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
            fullName: values.fullName,
            address: values.address,
        }, { merge: true });
        if (user.displayName !== values.fullName) {
            await updateProfile(user, { displayName: values.fullName });
        }
        toast({ title: 'Success', description: 'Your profile has been updated.' });
    } catch (error) {
        console.error("Profile update error:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile.' });
    } finally {
        setIsProfileSubmitting(false);
    }
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordFormSchema>) {
    if (!user || !user.email) return;
    setIsPasswordSubmitting(true);

    try {
        const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, values.newPassword);
        toast({ title: 'Success', description: 'Your password has been changed.' });
        passwordForm.reset();
    } catch (error: any) {
        console.error("Password change error:", error);
        toast({
            variant: 'destructive',
            title: 'Password Change Failed',
            description: error.code === 'auth/wrong-password' ? 'Incorrect current password.' : 'An error occurred. Please try again.',
        });
    } finally {
        setIsPasswordSubmitting(false);
    }
  }

  async function onMpinSubmit(values: z.infer<typeof mpinFormSchema>) {
    if(!user || !userData || !db) return;
    setIsMpinSubmitting(true);
    try {
        if (userData.mpin !== values.currentMpin) {
            toast({ variant: "destructive", title: "Error", description: "Your current MPIN is incorrect." });
            setIsMpinSubmitting(false);
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { mpin: values.newMpin }, { merge: true });
        toast({ title: "Success", description: "Your MPIN has been updated." });
        mpinForm.reset();
    } catch (error) {
        console.error("MPIN update error:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update MPIN." });
    } finally {
        setIsMpinSubmitting(false);
    }
  }
  
  if (authLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} disabled={isProfileSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} disabled /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Textarea {...field} disabled={isProfileSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isProfileSubmitting}>
                {isProfileSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your login password.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm. handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl><Input type="password" {...field} disabled={isPasswordSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl><Input type="password" {...field} disabled={isPasswordSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl><Input type="password" {...field} disabled={isPasswordSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPasswordSubmitting}>
                {isPasswordSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Change MPIN Card */}
      <Card>
        <CardHeader>
          <CardTitle>Change MPIN</CardTitle>
          <CardDescription>Update your 4-digit transaction PIN.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...mpinForm}>
            <form onSubmit={mpinForm.handleSubmit(onMpinSubmit)} className="space-y-4">
              <FormField
                control={mpinForm.control}
                name="currentMpin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current MPIN</FormLabel>
                    <FormControl><Input type="password" maxLength={4} {...field} disabled={isMpinSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={mpinForm.control}
                name="newMpin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New MPIN</FormLabel>
                    <FormControl><Input type="password" maxLength={4} {...field} disabled={isMpinSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={mpinForm.control}
                name="confirmMpin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New MPIN</FormLabel>
                    <FormControl><Input type="password" maxLength={4} {...field} disabled={isMpinSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isMpinSubmitting}>
                {isMpinSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change MPIN
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>
                  This is the Firebase project your application is currently connected to.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Project ID:</span>
                  <span className="font-mono text-sm bg-muted px-2 py-1 rounded-md">{projectId || 'Not available'}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                  Please verify that this Project ID matches the one you see in the URL of your Firebase Console.
              </p>
          </CardContent>
      </Card>

    </div>
  );
}
