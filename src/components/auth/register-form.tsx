'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Banknote, Camera, MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  mobileNumber: z.string().regex(/^\d{10}$/, { message: 'Please enter a valid 10-digit mobile number.' }),
  panCardNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Please enter a valid PAN card number.' }),
  address: z.string().min(10, { message: 'Address must be at least 10 characters.' }),
  mpin: z.string().regex(/^\d{4}$/, { message: 'MPIN must be a 4-digit number.' }),
  profilePicture: z.any()
    .refine((files) => files?.[0], 'Profile picture is required.')
    .refine((files) => files?.[0]?.size <= 5000000, `Max file size is 5MB.`)
    .refine(
      (files) => ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(files?.[0]?.type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ).nullable(),
});

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError('Could not get location. Please enable location services.');
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      mobileNumber: '',
      panCardNumber: '',
      address: '',
      mpin: '',
      profilePicture: null,
    },
  });

  if (!auth || !db || !storage) {
    // This case should be handled by AuthProvider, but as a fallback:
    return (
      <Card className="w-full max-w-lg shadow-2xl my-8">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Firebase is not configured. Cannot register.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPreviewUrl(URL.createObjectURL(file));
      form.setValue('profilePicture', e.target.files);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!values.profilePicture || values.profilePicture.length === 0) {
        form.setError('profilePicture', { type: 'manual', message: 'Profile picture is required.' });
        return;
    }
    if (!location) {
        toast({
            variant: "destructive",
            title: "Location Required",
            description: "We need your location to proceed with registration. Please enable location services.",
        });
        return;
    }
    setIsSubmitting(true);
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;

        const profilePicFile = values.profilePicture[0];
        const storageRef = ref(storage, `profilePictures/${user.uid}/${profilePicFile.name}`);
        const uploadResult = await uploadBytes(storageRef, profilePicFile);
        const profilePictureUrl = await getDownloadURL(uploadResult.ref);

        await updateProfile(user, {
            displayName: values.fullName,
            photoURL: profilePictureUrl,
        });

        const adminEmail = 'admin@veribank.com';
        const isAdmin = values.email === adminEmail;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            fullName: values.fullName,
            email: values.email,
            mobileNumber: values.mobileNumber,
            panCardNumber: values.panCardNumber,
            address: values.address,
            mpin: values.mpin,
            profilePictureUrl,
            registrationLocation: location,
            createdAt: serverTimestamp(),
            accountBalance: 10000,
            commissionPaid: 0,
            role: isAdmin ? 'admin' : 'user',
            accountStatus: 'active',
        });

        toast({
            title: 'Registration Successful',
            description: `Your account has been created. ${isAdmin ? 'You are now an administrator.' : 'Please log in.'}`,
        });
        router.push('/login');

    } catch (error: any) {
        console.error("Registration Error: ", error);
        let description = 'An unexpected error occurred. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                description = 'This email is already registered. Please log in instead.';
                break;
            case 'permission-denied':
                description = 'Database write failed. This is likely due to your Firestore Security Rules. Please go to the Firebase Console -> Firestore -> Rules and ensure that authenticated users can create their own documents. A common rule for this is: "allow create: if request.auth.uid == request.resource.data.uid;" under the path "match /users/{userId}".';
                break;
            case 'failed-precondition':
                description = 'Firestore database has not been created. Please go to the Firebase console to create a Firestore database.';
                break;
            case 'auth/configuration-not-found':
                description = 'Firebase Authentication is not configured. Please enable Email/Password sign-in provider in your Firebase console.';
                break;
        }
        
        toast({
            variant: "destructive",
            title: "Registration Failed",
            description: description,
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-lg shadow-2xl my-8">
      <CardHeader className="text-center">
        <Link href="/" className="flex items-center justify-center mb-4">
            <Banknote className="h-8 w-8 text-primary" />
            <span className="ml-2 text-2xl font-bold font-headline">VeriBank</span>
        </Link>
        <CardTitle className="text-2xl font-headline">Create Your Account</CardTitle>
        <CardDescription>Join the future of banking in just a few steps.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="profilePicture"
              render={({ field }) => (
                <FormItem className="flex flex-col items-center">
                  <FormLabel className="cursor-pointer">
                    <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors">
                      {previewUrl ? (
                        <Image src={previewUrl} alt="Profile preview" width={96} height={96} className="rounded-full object-cover w-full h-full" />
                      ) : (
                        <Camera className="w-8 h-8" />
                      )}
                    </div>
                  </FormLabel>
                  <FormControl>
                    <Input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="mobileNumber" render={({ field }) => (
                    <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input placeholder="9876543210" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="name@example.com" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="panCardNumber" render={({ field }) => (
                <FormItem><FormLabel>PAN Card Number</FormLabel><FormControl><Input placeholder="ABCDE1234F" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="123 Main St, Anytown..." {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="mpin" render={({ field }) => (
                <FormItem><FormLabel>4-Digit MPIN</FormLabel><FormControl><Input type="password" placeholder="••••" maxLength={4} {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary"/>
                {location ? <span>Location captured successfully.</span> : <span>{locationError || 'Capturing location...'}</span>}
            </div>

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-center text-sm">
        <p className="w-full">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
                Sign In
            </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
