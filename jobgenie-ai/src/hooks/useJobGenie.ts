import { useState } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export type ApplicationStatus = 'draft' | 'applied' | 'interview' | 'offer' | 'rejected' | 'accepted';

export interface ApplicationNote {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationReminder {
  id: string;
  title: string;
  dueDate: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelineEvent {
  id: string;
  type: 'status_change' | 'note_added' | 'reminder_added' | 'reminder_completed' | 'custom';
  title: string;
  description?: string;
  date: Date;
  createdAt: Date;
}

export interface JobApplication {
  id?: string;
  userId: string;
  resumeDetails: string;
  jobDescription: string;
  generatedResume?: string;
  generatedCoverLetter?: string;
  status: ApplicationStatus;
  companyName?: string;
  position?: string;
  notes?: ApplicationNote[];
  reminders?: ApplicationReminder[];
  tags?: string[];
  timeline?: TimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
  deleted?: boolean;
}

export const useJobGenie = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveApplication = async (data: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      const now = new Date();
      const initialTimelineEvent: TimelineEvent = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'status_change',
        title: 'Application Created',
        description: `Created as ${data.status}`,
        date: now,
        createdAt: now
      };

      const applicationData: Omit<JobApplication, 'id'> = {
        ...data,
        status: data.status || 'draft',
        notes: data.notes || [],
        reminders: data.reminders || [],
        tags: data.tags || [],
        timeline: [initialTimelineEvent],
        createdAt: now,
        updatedAt: now,
      };
      
      const docRef = await addDoc(collection(db, 'applications'), applicationData);
      const newApplication: JobApplication = { ...applicationData, id: docRef.id };
      setApplications(prev => [...prev, newApplication]);
      return docRef.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save application');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async (userId: string) => {
    try {
      setLoading(true);
      const q = query(collection(db, 'applications'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const loadedApplications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JobApplication[];
      
      setApplications(loadedApplications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const updateApplication = async (id: string, data: Partial<JobApplication>) => {
    try {
      setLoading(true);
      const now = new Date();
      const docRef = doc(db, 'applications', id);
      
      // Add timeline event for status changes
      if (data.status) {
        const application = applications.find(app => app.id === id);
        if (application && application.status !== data.status) {
          const timelineEvent: TimelineEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'status_change',
            title: 'Status Updated',
            description: `Changed from ${application.status} to ${data.status}`,
            date: now,
            createdAt: now
          };
          data.timeline = [...(application.timeline || []), timelineEvent];
        }
      }

      await updateDoc(docRef, {
        ...data,
        updatedAt: now
      });
      
      setApplications(prev => 
        prev.map(app => app.id === id ? { ...app, ...data } : app)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update application');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (applicationId: string, content: string) => {
    try {
      const now = new Date();
      const newNote: ApplicationNote = {
        id: Math.random().toString(36).substr(2, 9),
        content,
        createdAt: now,
        updatedAt: now
      };

      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const updatedNotes = [...(application.notes || []), newNote];
      const timelineEvent: TimelineEvent = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'note_added',
        title: 'Note Added',
        description: content,
        date: now,
        createdAt: now
      };

      await updateApplication(applicationId, { 
        notes: updatedNotes,
        timeline: [...(application.timeline || []), timelineEvent]
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
      throw err;
    }
  };

  const addReminder = async (applicationId: string, title: string, dueDate: Date) => {
    try {
      const now = new Date();
      const newReminder: ApplicationReminder = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        dueDate,
        completed: false,
        createdAt: now,
        updatedAt: now
      };

      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const updatedReminders = [...(application.reminders || []), newReminder];
      const timelineEvent: TimelineEvent = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'reminder_added',
        title: 'Reminder Added',
        description: title,
        date: now,
        createdAt: now
      };

      await updateApplication(applicationId, { 
        reminders: updatedReminders,
        timeline: [...(application.timeline || []), timelineEvent]
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add reminder');
      throw err;
    }
  };

  const toggleReminder = async (applicationId: string, reminderId: string) => {
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const reminder = application.reminders?.find(r => r.id === reminderId);
      if (!reminder) throw new Error('Reminder not found');

      const updatedReminders = application.reminders?.map(r => 
        r.id === reminderId 
          ? { ...r, completed: !r.completed, updatedAt: new Date() }
          : r
      );

      const now = new Date();
      const timelineEvent: TimelineEvent = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'reminder_completed',
        title: reminder.completed ? 'Reminder Reopened' : 'Reminder Completed',
        description: reminder.title,
        date: now,
        createdAt: now
      };

      await updateApplication(applicationId, { 
        reminders: updatedReminders,
        timeline: [...(application.timeline || []), timelineEvent]
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle reminder');
      throw err;
    }
  };

  const deleteNote = async (applicationId: string, noteId: string) => {
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const updatedNotes = application.notes?.filter(note => note.id !== noteId);
      await updateApplication(applicationId, { notes: updatedNotes });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
      throw err;
    }
  };

  const deleteReminder = async (applicationId: string, reminderId: string) => {
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const updatedReminders = application.reminders?.filter(reminder => reminder.id !== reminderId);
      await updateApplication(applicationId, { reminders: updatedReminders });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete reminder');
      throw err;
    }
  };

  const addTag = async (applicationId: string, tag: string) => {
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const updatedTags = Array.from(new Set([...(application.tags || []), tag]));
      await updateApplication(applicationId, { tags: updatedTags });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tag');
      throw err;
    }
  };

  const removeTag = async (applicationId: string, tag: string) => {
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const updatedTags = application.tags?.filter(t => t !== tag);
      await updateApplication(applicationId, { tags: updatedTags });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tag');
      throw err;
    }
  };

  const addTimelineEvent = async (applicationId: string, title: string, description?: string) => {
    try {
      const now = new Date();
      const timelineEvent: TimelineEvent = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'custom',
        title,
        description,
        date: now,
        createdAt: now
      };

      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      await updateApplication(applicationId, {
        timeline: [...(application.timeline || []), timelineEvent]
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add timeline event');
      throw err;
    }
  };

  const exportToPDF = async (application: JobApplication) => {
    try {
      // Create a formatted document
      const doc = {
        content: [
          { text: 'Job Application Details', style: 'header' },
          { text: '\n' },
          { text: 'Company: ' + (application.companyName || 'Not specified'), style: 'subheader' },
          { text: 'Position: ' + (application.position || 'Not specified'), style: 'subheader' },
          { text: 'Status: ' + application.status.toUpperCase(), style: 'subheader' },
          { text: '\n' },
          { text: 'Tags:', style: 'sectionHeader' },
          { text: (application.tags || []).join(', ') || 'No tags', style: 'tags' },
          { text: '\n' },
          { text: 'Resume Details:', style: 'sectionHeader' },
          { text: application.resumeDetails },
          { text: '\n' },
          { text: 'Job Description:', style: 'sectionHeader' },
          { text: application.jobDescription },
          { text: '\n' },
          { text: 'Generated Resume:', style: 'sectionHeader' },
          { text: application.generatedResume || 'Not generated yet' },
          { text: '\n' },
          { text: 'Generated Cover Letter:', style: 'sectionHeader' },
          { text: application.generatedCoverLetter || 'Not generated yet' },
          { text: '\n' },
          { text: 'Notes:', style: 'sectionHeader' },
          ...(application.notes?.map(note => [
            { text: note.content },
            { text: 'Added: ' + note.createdAt.toLocaleDateString(), style: 'noteDate' }
          ]).flat() || [{ text: 'No notes' }]),
          { text: '\n' },
          { text: 'Reminders:', style: 'sectionHeader' },
          ...(application.reminders?.map(reminder => [
            { text: reminder.title + (reminder.completed ? ' (Completed)' : '') },
            { text: 'Due: ' + reminder.dueDate.toLocaleDateString(), style: 'reminderDate' }
          ]).flat() || [{ text: 'No reminders' }]),
          { text: '\n' },
          { text: 'Timeline:', style: 'sectionHeader' },
          ...(application.timeline?.map(event => [
            { text: event.title, style: 'timelineTitle' },
            { text: event.description || '', style: 'timelineDescription' },
            { text: event.date.toLocaleDateString(), style: 'timelineDate' }
          ]).flat() || [{ text: 'No timeline events' }]),
          { text: '\n' },
          { text: 'Created: ' + application.createdAt.toLocaleDateString() },
          { text: 'Last Updated: ' + application.updatedAt.toLocaleDateString() }
        ],
        styles: {
          header: {
            fontSize: 22,
            bold: true,
            margin: [0, 0, 0, 10]
          },
          subheader: {
            fontSize: 16,
            bold: true,
            margin: [0, 10, 0, 5]
          },
          sectionHeader: {
            fontSize: 14,
            bold: true,
            margin: [0, 10, 0, 5]
          },
          noteDate: {
            fontSize: 10,
            italics: true,
            color: 'gray',
            margin: [0, 0, 0, 5]
          },
          reminderDate: {
            fontSize: 10,
            color: 'gray',
            margin: [0, 0, 0, 5]
          },
          timelineTitle: {
            fontSize: 12,
            bold: true,
            margin: [0, 5, 0, 2]
          },
          timelineDescription: {
            fontSize: 10,
            margin: [0, 0, 0, 2]
          },
          timelineDate: {
            fontSize: 10,
            color: 'gray',
            margin: [0, 0, 0, 5]
          },
          tags: {
            fontSize: 12,
            color: 'blue',
            margin: [0, 0, 0, 5]
          }
        }
      };

      // Convert to PDF and download
      const pdfBlob = new Blob([JSON.stringify(doc)], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `application_${application.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export application');
      throw err;
    }
  };

  return {
    applications,
    loading,
    error,
    saveApplication,
    loadApplications,
    updateApplication,
    addNote,
    addReminder,
    toggleReminder,
    deleteNote,
    deleteReminder,
    addTag,
    removeTag,
    addTimelineEvent,
    exportToPDF
  };
}; 