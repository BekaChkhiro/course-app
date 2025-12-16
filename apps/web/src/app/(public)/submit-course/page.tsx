'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { publicApi } from '@/lib/api/publicApi';
import Link from 'next/link';

interface CourseSubmissionFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  courseTitle: string;
  courseDescription: string;
  driveLink?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 5;
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
];

export default function SubmitCoursePage() {
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CourseSubmissionFormData>();

  const driveLink = watch('driveLink');

  const mutation = useMutation({
    mutationFn: async (data: CourseSubmissionFormData) => {
      const formData = new FormData();
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      formData.append('email', data.email);
      formData.append('phone', data.phone);
      formData.append('courseTitle', data.courseTitle);
      formData.append('courseDescription', data.courseDescription);
      if (data.driveLink) {
        formData.append('driveLink', data.driveLink);
      }
      files.forEach((file) => {
        formData.append('files', file);
      });
      return publicApi.submitCourse(formData);
    },
    onSuccess: () => {
      setSubmitted(true);
      reset();
      setFiles([]);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFileError(null);

    // Validate file count
    if (files.length + selectedFiles.length > MAX_FILES) {
      setFileError(`მაქსიმუმ ${MAX_FILES} ფაილის ატვირთვა შეიძლება`);
      return;
    }

    // Validate each file
    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`ფაილი "${file.name}" აღემატება 50MB ლიმიტს`);
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setFileError(`ფაილი "${file.name}" არ არის დაშვებული ტიპის (PDF, ZIP, MP4, WebM, MOV)`);
        return;
      }
    }

    setFiles((prev) => [...prev, ...selectedFiles]);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('video/')) {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    if (type === 'application/pdf') {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    );
  };

  const onSubmit = (data: CourseSubmissionFormData) => {
    // Validate that either files or driveLink is provided
    if (files.length === 0 && !data.driveLink) {
      setFileError('გთხოვთ ატვირთოთ ფაილები ან მიუთითოთ Drive ლინკი');
      return;
    }
    mutation.mutate(data);
  };

  const benefits = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'შემოსავალი',
      description: 'მიიღე შემოსავალი შენი ცოდნის გაზიარებით',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'აუდიტორია',
      description: 'მიაღწიე ათასობით სტუდენტს საქართველოში',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'მხარდაჭერა',
      description: 'სრული მხარდაჭერა კურსის შექმნის პროცესში',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-primary-900 py-20">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white">გახდი ინსტრუქტორი</h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-primary-100">
            გააზიარე შენი ცოდნა და მიიღე შემოსავალი
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <div className="w-12 h-12 mx-auto bg-primary-100 rounded-xl flex items-center justify-center text-primary-900 mb-4">
                  {benefit.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">კურსის განაცხადი</h2>
            <p className="text-gray-600 mb-8">
              შეავსე ფორმა და ჩვენი გუნდი დაგიკავშირდება მალე
            </p>

            {submitted ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">განაცხადი გაიგზავნა!</h3>
                <p className="text-gray-600 mb-6">
                  მადლობა დაინტერესებისთვის! ჩვენი გუნდი განიხილავს თქვენს განაცხადს და მალე დაგიკავშირდებით.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  დადასტურების ელ-ფოსტა გამოგეგზავნათ მითითებულ მისამართზე.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-6 py-3 bg-primary-900 text-white rounded-xl font-medium hover:bg-primary-800 transition-colors"
                  >
                    ახალი განაცხადი
                  </button>
                  <Link
                    href="/"
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    მთავარ გვერდზე
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      სახელი <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('firstName', { required: 'სახელი აუცილებელია' })}
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="თქვენი სახელი"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      გვარი <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('lastName', { required: 'გვარი აუცილებელია' })}
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="თქვენი გვარი"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ელ-ფოსტა <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('email', {
                        required: 'ელ-ფოსტა აუცილებელია',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'არასწორი ელ-ფოსტის ფორმატი',
                        },
                      })}
                      type="email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="example@email.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ტელეფონი <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('phone', {
                        required: 'ტელეფონი აუცილებელია',
                        pattern: {
                          value: /^(\+995|995|0)?5\d{8}$/,
                          message: 'არასწორი ტელეფონის ფორმატი (მაგ: 555123456)',
                        },
                      })}
                      type="tel"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="555 123 456"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                {/* Course Info */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">კურსის ინფორმაცია</h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        კურსის დასახელება <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('courseTitle', {
                          required: 'კურსის დასახელება აუცილებელია',
                          minLength: { value: 5, message: 'მინიმუმ 5 სიმბოლო' },
                        })}
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="მაგ: Python პროგრამირების საფუძვლები"
                      />
                      {errors.courseTitle && (
                        <p className="mt-1 text-sm text-red-600">{errors.courseTitle.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        კურსის აღწერა <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        {...register('courseDescription', {
                          required: 'კურსის აღწერა აუცილებელია',
                          minLength: { value: 50, message: 'მინიმუმ 50 სიმბოლო' },
                        })}
                        rows={5}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        placeholder="აღწერე კურსის შინაარსი, რას ისწავლიან სტუდენტები, ვისთვისაა განკუთვნილი..."
                      />
                      {errors.courseDescription && (
                        <p className="mt-1 text-sm text-red-600">{errors.courseDescription.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Files Section */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">კურსის მასალები</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    ატვირთე კურსის ფაილები ან გააზიარე Google Drive ლინკი
                  </p>

                  {/* File Upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ფაილების ატვირთვა
                      <span className="text-gray-500 font-normal"> (PDF, ZIP, MP4, WebM, MOV - მაქს. 50MB)</span>
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                        files.length >= MAX_FILES
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                          : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50'
                      }`}
                      onClick={() => files.length < MAX_FILES && fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.zip,video/mp4,video/webm,video/ogg,video/quicktime"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={files.length >= MAX_FILES}
                      />
                      <svg
                        className="w-10 h-10 mx-auto text-gray-400 mb-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-sm text-gray-600">
                        {files.length >= MAX_FILES
                          ? 'მაქსიმალური რაოდენობა მიღწეულია'
                          : 'დააკლიკე ფაილების ასარჩევად'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {files.length}/{MAX_FILES} ფაილი
                      </p>
                    </div>
                  </div>

                  {/* Selected Files */}
                  {files.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-gray-500">{getFileIcon(file.type)}</div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 truncate max-w-[200px] sm:max-w-[300px]">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Drive Link */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Drive ლინკი
                      <span className="text-gray-500 font-normal"> (ოფციური)</span>
                    </label>
                    <input
                      {...register('driveLink', {
                        pattern: {
                          value: /^https:\/\/(drive\.google\.com|docs\.google\.com)/,
                          message: 'გთხოვთ მიუთითოთ ვალიდური Google Drive ლინკი',
                        },
                      })}
                      type="url"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="https://drive.google.com/..."
                    />
                    {errors.driveLink && (
                      <p className="mt-1 text-sm text-red-600">{errors.driveLink.message}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      დარწმუნდი რომ ლინკზე წვდომა ღიაა (Anyone with the link)
                    </p>
                  </div>

                  {/* File/Link Error */}
                  {fileError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-600">{fileError}</p>
                    </div>
                  )}

                  {/* Validation hint */}
                  {files.length === 0 && !driveLink && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <p className="text-sm text-yellow-800">
                        გთხოვთ ატვირთოთ ფაილები ან მიუთითოთ Drive ლინკი
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full bg-accent-600 text-white py-4 rounded-xl font-medium hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
                >
                  {mutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      იგზავნება...
                    </>
                  ) : (
                    'განაცხადის გაგზავნა'
                  )}
                </button>

                {mutation.isError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-center text-sm text-red-600">
                      {(mutation.error as Error)?.message || 'შეცდომა გაგზავნისას. გთხოვთ სცადოთ ხელახლა.'}
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">როგორ მუშაობს?</h2>
            <p className="mt-4 text-lg text-gray-600">მარტივი პროცესი კურსის გამოქვეყნებამდე</p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'შეავსე განაცხადი',
                description: 'მოგვაწოდე ინფორმაცია შენსა და კურსის შესახებ',
              },
              {
                step: '02',
                title: 'განხილვა',
                description: 'ჩვენი გუნდი განიხილავს კურსის მასალებს და დაგიკავშირდება',
              },
              {
                step: '03',
                title: 'შეთანხმება',
                description: 'შევთანხმდებით პირობებზე და მომზადების გეგმაზე',
              },
              {
                step: '04',
                title: 'გამოქვეყნება',
                description: 'კურსი გამოქვეყნდება და დაიწყებ შემოსავლის მიღებას',
              },
            ].map((item, index) => (
              <div key={index} className="flex items-start space-x-6">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-900 text-white rounded-full flex items-center justify-center font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
