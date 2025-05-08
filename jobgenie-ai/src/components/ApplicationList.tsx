import React, { useEffect, useState, useMemo } from 'react';
import { useJobGenie, ApplicationStatus, JobApplication } from '../hooks/useJobGenie';
import { auth } from '../firebase';
import { openDB, DBSchema } from 'idb';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';

interface ApplicationListProps {
  onEdit: (application: JobApplication) => void;
}

interface JobGenieDB extends DBSchema {
  backups: {
    key: string;
    value: {
      timestamp: string;
      applications: JobApplication[];
      settings: {
        viewMode: 'list' | 'dashboard';
        selectedTimeRange: 'week' | 'month' | 'year' | 'all';
        insightFilter: 'all' | 'success' | 'improvement';
        selectedTags: string[];
        dateRange: { start: string; end: string };
      };
    };
  };
}

type SortField = 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  applied: 'bg-blue-100 text-blue-800',
  interview: 'bg-yellow-100 text-yellow-800',
  offer: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  accepted: 'bg-purple-100 text-purple-800'
};

const CHART_COLORS = {
  draft: '#94A3B8',
  applied: '#3B82F6',
  interview: '#F59E0B',
  offer: '#10B981',
  rejected: '#EF4444',
  accepted: '#8B5CF6'
};

const defaultDashboardPrefs = {
  showTrends: true,
  showStatus: true,
  showCompanies: true,
  showResponse: true,
  showStats: true,
  showInsights: true
};

type DashboardPrefs = typeof defaultDashboardPrefs;

export const ApplicationList: React.FC<ApplicationListProps> = ({ onEdit }) => {
  const { 
    applications, 
    loading, 
    error, 
    loadApplications, 
    updateApplication, 
    exportToPDF,
    addNote,
    addReminder,
    toggleReminder,
    deleteNote,
    deleteReminder,
    addTag,
    removeTag,
    addTimelineEvent
  } = useJobGenie();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newReminder, setNewReminder] = useState({ title: '', dueDate: '' });
  const [newTag, setNewTag] = useState('');
  const [newTimelineEvent, setNewTimelineEvent] = useState({ title: '', description: '' });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [timelineView, setTimelineView] = useState<'all' | 'status' | 'notes' | 'reminders'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'dashboard'>('list');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [insightFilter, setInsightFilter] = useState<'all' | 'success' | 'improvement'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'in_progress' | 'success' | 'error'>('idle');
  const [analyticsExportFormat, setAnalyticsExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [showTour, setShowTour] = useState(false);

  // Dashboard customization state
  const [dashboardPrefs, setDashboardPrefs] = useState<DashboardPrefs>(() => {
    const saved = localStorage.getItem('dashboardPrefs');
    return saved ? JSON.parse(saved) : defaultDashboardPrefs;
  });
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  useEffect(() => {
    if (auth.currentUser) {
      loadApplications(auth.currentUser.uid);
    }
  }, [loadApplications]);

  useEffect(() => {
    localStorage.setItem('dashboardPrefs', JSON.stringify(dashboardPrefs));
  }, [dashboardPrefs]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      try {
        await updateApplication(id, { deleted: true });
      } catch (err) {
        console.error('Failed to delete application:', err);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedApps.size} applications?`)) {
      try {
        await Promise.all(
          Array.from(selectedApps).map(id => updateApplication(id, { deleted: true }))
        );
        setSelectedApps(new Set());
        setShowBulkActions(false);
      } catch (err) {
        console.error('Failed to delete applications:', err);
      }
    }
  };

  const handleBulkStatusChange = async (newStatus: ApplicationStatus) => {
    try {
      await Promise.all(
        Array.from(selectedApps).map(id => updateApplication(id, { status: newStatus }))
      );
      setSelectedApps(new Set());
      setShowBulkActions(false);
    } catch (err) {
      console.error('Failed to update applications:', err);
    }
  };

  const handleBulkExport = async () => {
    try {
      const selectedApplications = filteredAndSortedApplications.filter(app => selectedApps.has(app.id!));
      await Promise.all(selectedApplications.map(app => exportToPDF(app)));
      setSelectedApps(new Set());
      setShowBulkActions(false);
    } catch (err) {
      console.error('Failed to export applications:', err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    try {
      await updateApplication(id, { status: newStatus });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAddNote = async (applicationId: string) => {
    if (!newNote.trim()) return;
    try {
      await addNote(applicationId, newNote.trim());
      setNewNote('');
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const handleAddReminder = async (applicationId: string) => {
    if (!newReminder.title.trim() || !newReminder.dueDate) return;
    try {
      await addReminder(applicationId, newReminder.title.trim(), new Date(newReminder.dueDate));
      setNewReminder({ title: '', dueDate: '' });
    } catch (err) {
      console.error('Failed to add reminder:', err);
    }
  };

  const handleAddTag = async (applicationId: string) => {
    if (!newTag.trim()) return;
    try {
      await addTag(applicationId, newTag.trim());
      setNewTag('');
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  const handleAddTimelineEvent = async (applicationId: string) => {
    if (!newTimelineEvent.title.trim()) return;
    try {
      await addTimelineEvent(applicationId, newTimelineEvent.title.trim(), newTimelineEvent.description.trim());
      setNewTimelineEvent({ title: '', description: '' });
    } catch (err) {
      console.error('Failed to add timeline event:', err);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const toggleSelectAll = () => {
    if (selectedApps.size === filteredAndSortedApplications.length) {
      setSelectedApps(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedApps(new Set(filteredAndSortedApplications.map(app => app.id!)));
      setShowBulkActions(true);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedApps);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedApps(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    applications.forEach(app => {
      app.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [applications]);

  const filteredAndSortedApplications = useMemo(() => {
    const activeApps = applications.filter(app => !app.deleted);
    
    // Apply search filter
    const searchFiltered = searchQuery
      ? activeApps.filter(app => 
          app.resumeDetails.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.jobDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.notes?.some(note => note.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
          app.reminders?.some(reminder => reminder.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          app.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : activeApps;

    // Apply status filter
    const statusFiltered = statusFilter === 'all'
      ? searchFiltered
      : searchFiltered.filter(app => app.status === statusFilter);

    // Apply tag filter
    const tagFiltered = selectedTags.size > 0
      ? statusFiltered.filter(app => 
          app.tags?.some(tag => selectedTags.has(tag))
        )
      : statusFiltered;

    // Apply date range filter
    const dateFiltered = dateRange.start || dateRange.end
      ? tagFiltered.filter(app => {
          const appDate = new Date(app.createdAt);
          const startDate = dateRange.start ? new Date(dateRange.start) : null;
          const endDate = dateRange.end ? new Date(dateRange.end) : null;
          
          if (startDate && endDate) {
            return appDate >= startDate && appDate <= endDate;
          } else if (startDate) {
            return appDate >= startDate;
          } else if (endDate) {
            return appDate <= endDate;
          }
          return true;
        })
      : tagFiltered;

    // Apply sorting
    return dateFiltered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const modifier = sortOrder === 'asc' ? 1 : -1;
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return (aValue.getTime() - bValue.getTime()) * modifier;
      }
      return 0;
    });
  }, [applications, searchQuery, sortField, sortOrder, statusFilter, selectedTags, dateRange]);

  const toggleTag = (tag: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tag)) {
      newSelected.delete(tag);
    } else {
      newSelected.add(tag);
    }
    setSelectedTags(newSelected);
  };

  const dashboardStats = useMemo(() => {
    const now = new Date();
    const timeRanges = {
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      all: new Date(0)
    };

    const startDate = timeRanges[selectedTimeRange];
    const filteredApps = applications.filter(app => 
      !app.deleted && new Date(app.createdAt) >= startDate
    );

    const stats = {
      totalApplications: filteredApps.length,
      statusDistribution: {} as Record<ApplicationStatus, number>,
      responseRate: 0,
      interviewRate: 0,
      offerRate: 0,
      averageResponseTime: 0,
      averageInterviewTime: 0,
      topCompanies: [] as { name: string; count: number }[],
      topPositions: [] as { position: string; count: number }[],
      successInsights: [] as string[],
      improvementInsights: [] as string[],
      applicationTrend: [] as { date: string; count: number }[],
      tagDistribution: {} as Record<string, number>,
      reminderCompletion: { completed: 0, total: 0 }
    };

    // Calculate status distribution and rates
    let totalApplied = 0;
    let totalInterviews = 0;
    let totalOffers = 0;
    let totalResponseTime = 0;
    let totalInterviewTime = 0;
    let responseCount = 0;
    let interviewCount = 0;

    const companyCounts: Record<string, number> = {};
    const positionCounts: Record<string, number> = {};
    const dateCounts: Record<string, number> = {};

    filteredApps.forEach(app => {
      // Status counts
      stats.statusDistribution[app.status] = (stats.statusDistribution[app.status] || 0) + 1;
      
      // Company and position counts
      if (app.companyName) {
        companyCounts[app.companyName] = (companyCounts[app.companyName] || 0) + 1;
      }
      if (app.position) {
        positionCounts[app.position] = (positionCounts[app.position] || 0) + 1;
      }

      // Date counts for trend
      const date = new Date(app.createdAt).toLocaleDateString();
      dateCounts[date] = (dateCounts[date] || 0) + 1;

      // Tag distribution
      app.tags?.forEach(tag => {
        stats.tagDistribution[tag] = (stats.tagDistribution[tag] || 0) + 1;
      });

      // Reminder completion
      app.reminders?.forEach(reminder => {
        stats.reminderCompletion.total++;
        if (reminder.completed) {
          stats.reminderCompletion.completed++;
        }
      });

      // Calculate rates and times
      if (app.status === 'applied') totalApplied++;
      if (app.status === 'interview') totalInterviews++;
      if (app.status === 'offer') totalOffers++;

      const timeline = app.timeline || [];
      const createdEvent = timeline.find(e => e.type === 'status_change' && e.title === 'Application Created');
      const appliedEvent = timeline.find(e => e.type === 'status_change' && e.description?.includes('to applied'));
      const interviewEvent = timeline.find(e => e.type === 'status_change' && e.description?.includes('to interview'));

      if (createdEvent && appliedEvent) {
        const responseTime = appliedEvent.date.getTime() - createdEvent.date.getTime();
        totalResponseTime += responseTime;
        responseCount++;
      }

      if (appliedEvent && interviewEvent) {
        const interviewTime = interviewEvent.date.getTime() - appliedEvent.date.getTime();
        totalInterviewTime += interviewTime;
        interviewCount++;
      }
    });

    // Calculate rates
    stats.responseRate = totalApplied > 0 ? (totalInterviews / totalApplied) * 100 : 0;
    stats.interviewRate = totalInterviews > 0 ? (totalOffers / totalInterviews) * 100 : 0;
    stats.offerRate = totalApplied > 0 ? (totalOffers / totalApplied) * 100 : 0;

    // Calculate average times
    stats.averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount / (1000 * 60 * 60 * 24) : 0;
    stats.averageInterviewTime = interviewCount > 0 ? totalInterviewTime / interviewCount / (1000 * 60 * 60 * 24) : 0;

    // Sort and limit top companies and positions
    stats.topCompanies = Object.entries(companyCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    stats.topPositions = Object.entries(positionCounts)
      .map(([position, count]) => ({ position, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Generate application trend
    stats.applicationTrend = Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Generate insights
    if (stats.responseRate > 50) {
      stats.successInsights.push('High response rate indicates strong application materials');
    } else {
      stats.improvementInsights.push('Consider reviewing and improving application materials');
    }

    if (stats.interviewRate > 30) {
      stats.successInsights.push('Good interview conversion rate');
    } else {
      stats.improvementInsights.push('Focus on interview preparation and follow-up');
    }

    if (stats.averageResponseTime < 7) {
      stats.successInsights.push('Quick response times from companies');
    } else {
      stats.improvementInsights.push('Consider following up on applications after 1 week');
    }

    return stats;
  }, [applications, selectedTimeRange]);

  const chartData = useMemo(() => {
    const now = new Date();
    const ranges = {
      week: 7,
      month: 30,
      year: 365
    };
    let days: number;
    if (selectedTimeRange === 'all') {
      // Calculate the number of days between the earliest and latest application
      const dates = applications.filter(app => !app.deleted).map(app => new Date(app.createdAt));
      if (dates.length === 0) days = 1;
      else {
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        days = Math.max(1, Math.ceil((now.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
      }
    } else {
      days = ranges[selectedTimeRange];
    }
    const data = Array.from({ length: days }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - i - 1));
      return {
        date: date.toLocaleDateString(),
        applications: 0,
        responses: 0,
        interviews: 0
      };
    });

    applications.forEach(app => {
      if (app.deleted) return;

      const appDate = new Date(app.createdAt);
      const daysDiff = Math.floor((now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < days) {
        const index = days - daysDiff - 1;
        data[index].applications++;

        // Check for response
        const responseEvent = app.timeline?.find(e => 
          e.type === 'status_change' && 
          e.description?.includes('to applied')
        );
        if (responseEvent) {
          const responseDate = new Date(responseEvent.date);
          const responseDaysDiff = Math.floor((now.getTime() - responseDate.getTime()) / (1000 * 60 * 60 * 24));
          if (responseDaysDiff < days) {
            data[days - responseDaysDiff - 1].responses++;
          }
        }

        // Check for interview
        const interviewEvent = app.timeline?.find(e => 
          e.type === 'status_change' && 
          e.description?.includes('to interview')
        );
        if (interviewEvent) {
          const interviewDate = new Date(interviewEvent.date);
          const interviewDaysDiff = Math.floor((now.getTime() - interviewDate.getTime()) / (1000 * 60 * 60 * 24));
          if (interviewDaysDiff < days) {
            data[days - interviewDaysDiff - 1].interviews++;
          }
        }
      }
    });

    return data;
  }, [applications, selectedTimeRange]);

  const statusData = useMemo(() => {
    return Object.entries(dashboardStats.statusDistribution).map(([status, count]) => ({
      name: status,
      value: count,
      color: CHART_COLORS[status as ApplicationStatus]
    }));
  }, [dashboardStats.statusDistribution]);

  const handleExportAnalytics = async () => {
    setIsExporting(true);
    try {
      const analyticsData = {
        timestamp: new Date().toISOString(),
        timeRange: selectedTimeRange,
        stats: dashboardStats,
        applications: filteredAndSortedApplications.map(app => ({
          id: app.id,
          companyName: app.companyName,
          position: app.position,
          status: app.status,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          tags: app.tags,
          notes: app.notes?.length || 0,
          reminders: app.reminders?.length || 0,
          timeline: app.timeline?.length || 0
        }))
      };

      let blob: Blob;
      let filename: string;

      switch (analyticsExportFormat) {
        case 'csv':
          const csvContent = [
            ['Metric', 'Value'],
            ['Total Applications', dashboardStats.totalApplications],
            ['Response Rate', `${dashboardStats.responseRate.toFixed(1)}%`],
            ['Interview Rate', `${dashboardStats.interviewRate.toFixed(1)}%`],
            ['Offer Rate', `${dashboardStats.offerRate.toFixed(1)}%`],
            ['Average Response Time', `${dashboardStats.averageResponseTime.toFixed(1)} days`],
            ['Average Interview Time', `${dashboardStats.averageInterviewTime.toFixed(1)} days`],
            ['', ''],
            ['Status Distribution', ''],
            ...Object.entries(dashboardStats.statusDistribution).map(([status, count]) => 
              [status, count.toString()]
            ),
            ['', ''],
            ['Top Companies', 'Count'],
            ...dashboardStats.topCompanies.map(({ name, count }) => 
              [name, count.toString()]
            ),
            ['', ''],
            ['Top Positions', 'Count'],
            ...dashboardStats.topPositions.map(({ position, count }) => 
              [position, count.toString()]
            )
          ].map(row => row.join(',')).join('\n');

          blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          filename = `jobgenie-analytics-${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'json':
          blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
          filename = `jobgenie-analytics-${new Date().toISOString().split('T')[0]}.json`;
          break;

        case 'pdf':
          // Create a temporary application object for PDF export
          const tempApp = {
            id: 'analytics',
            userId: auth.currentUser?.uid || 'system',
            companyName: 'Analytics Report',
            position: 'Dashboard Summary',
            status: 'draft' as ApplicationStatus,
            createdAt: new Date(),
            updatedAt: new Date(),
            resumeDetails: JSON.stringify(analyticsData, null, 2),
            jobDescription: 'Analytics Report',
            tags: [],
            notes: [],
            reminders: [],
            timeline: []
          };
          await exportToPDF(tempApp);
          setIsExporting(false);
          toast.success('Export successful!');
          return;
      }

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Failed to export analytics:', error);
      toast.error('Failed to export analytics. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackup = async () => {
    setBackupStatus('in_progress');
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        applications: applications,
        settings: {
          viewMode,
          selectedTimeRange,
          insightFilter,
          selectedTags: Array.from(selectedTags),
          dateRange
        }
      };

      // Store in localStorage as a backup
      localStorage.setItem('jobgenie_backup', JSON.stringify(backupData));
      
      // Also store in IndexedDB for larger datasets
      const db = await openDB<JobGenieDB>('jobgenie', 1, {
        upgrade(db) {
          db.createObjectStore('backups');
        },
      });
      
      await db.put('backups', backupData, 'latest');
      setLastBackup(new Date());
      setBackupStatus('success');
      toast.success('Backup created successfully!');
      
      // Clear success status after 3 seconds
      setTimeout(() => setBackupStatus('idle'), 3000);
    } catch (error) {
      console.error('Backup failed:', error);
      setBackupStatus('error');
      toast.error('Failed to create backup. Please try again.');
    }
  };

  const handleRestore = async () => {
    if (!window.confirm('Are you sure you want to restore from backup? This will overwrite current data.')) {
      return;
    }

    try {
      // Try to restore from IndexedDB first
      const db = await openDB<JobGenieDB>('jobgenie', 1);
      const backup = await db.get('backups', 'latest');
      
      if (backup) {
        // Restore applications
        await Promise.all(
          backup.applications.map((app: JobApplication) => updateApplication(app.id!, app))
        );
        
        // Restore settings
        setViewMode(backup.settings.viewMode);
        setSelectedTimeRange(backup.settings.selectedTimeRange);
        setInsightFilter(backup.settings.insightFilter);
        setSelectedTags(new Set(backup.settings.selectedTags));
        setDateRange(backup.settings.dateRange);
        
        toast.success('Backup restored successfully!');
      } else {
        // Fallback to localStorage
        const localBackup = localStorage.getItem('jobgenie_backup');
        if (localBackup) {
          const backup = JSON.parse(localBackup);
          // Restore applications
          await Promise.all(
            backup.applications.map((app: JobApplication) => updateApplication(app.id!, app))
          );
          toast.success('Backup restored successfully!');
        } else {
          throw new Error('No backup found');
        }
      }
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error('Failed to restore from backup. Please try again.');
    }
  };

  // Add backup status indicator to the dashboard
  const renderBackupStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      {backupStatus === 'in_progress' && (
        <span className="text-blue-500">Backing up...</span>
      )}
      {backupStatus === 'success' && (
        <span className="text-green-500">Backup successful!</span>
      )}
      {backupStatus === 'error' && (
        <span className="text-red-500">Backup failed</span>
      )}
      {lastBackup && (
        <span className="text-gray-500">
          Last backup: {lastBackup.toLocaleString()}
        </span>
      )}
    </div>
  );

  // Add export controls to the dashboard
  const renderExportControls = () => (
    <div className="flex items-center gap-4">
      <select
        value={analyticsExportFormat}
        onChange={(e) => setAnalyticsExportFormat(e.target.value as typeof analyticsExportFormat)}
        className="text-sm border border-gray-300 rounded px-2 py-1"
      >
        <option value="csv">CSV</option>
        <option value="json">JSON</option>
        <option value="pdf">PDF</option>
      </select>
      <button
        onClick={handleExportAnalytics}
        disabled={isExporting}
        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition disabled:opacity-50"
      >
        {isExporting ? 'Exporting...' : 'Export Analytics'}
      </button>
    </div>
  );

  // Add backup controls to the dashboard
  const renderBackupControls = () => (
    <div className="flex items-center gap-4">
      <button
        onClick={handleBackup}
        disabled={backupStatus === 'in_progress'}
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
      >
        Create Backup
      </button>
      <button
        onClick={handleRestore}
        className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
      >
        Restore from Backup
      </button>
      {renderBackupStatus()}
    </div>
  );

  // Helper functions for export/print
  const exportChartAsImage = async (chartId: string, fileName: string) => {
    const chart = document.getElementById(chartId);
    if (!chart) return;
    const canvas = await html2canvas(chart);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const printChart = (chartId: string) => {
    const chart = document.getElementById(chartId);
    if (!chart) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Chart</title></head><body>');
      printWindow.document.write(chart.outerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  const renderCustomizeModal = () => (
    showCustomizeModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <h3 className="text-lg font-bold mb-4">Customize Dashboard</h3>
          <div className="space-y-3 mb-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={dashboardPrefs.showTrends} onChange={e => setDashboardPrefs((p: DashboardPrefs) => ({ ...p, showTrends: e.target.checked }))} />
              Application Trends
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={dashboardPrefs.showStatus} onChange={e => setDashboardPrefs((p: DashboardPrefs) => ({ ...p, showStatus: e.target.checked }))} />
              Status Distribution
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={dashboardPrefs.showCompanies} onChange={e => setDashboardPrefs((p: DashboardPrefs) => ({ ...p, showCompanies: e.target.checked }))} />
              Top Companies
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={dashboardPrefs.showResponse} onChange={e => setDashboardPrefs((p: DashboardPrefs) => ({ ...p, showResponse: e.target.checked }))} />
              Response Time Analysis
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={dashboardPrefs.showStats} onChange={e => setDashboardPrefs((p: DashboardPrefs) => ({ ...p, showStats: e.target.checked }))} />
              Key Stats (Totals)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={dashboardPrefs.showInsights} onChange={e => setDashboardPrefs((p: DashboardPrefs) => ({ ...p, showInsights: e.target.checked }))} />
              Insights
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCustomizeModal(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Close</button>
          </div>
        </div>
      </div>
    )
  );

  const renderTourModal = () => (
    showTour && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg" role="dialog" aria-modal="true" aria-labelledby="tourTitle">
          <h3 className="text-2xl font-bold mb-4" id="tourTitle">Welcome to JobGenie AI!</h3>
          <ol className="list-decimal list-inside space-y-3 text-lg mb-6">
            <li><b>Dashboard:</b> View analytics, trends, and insights about your job applications.</li>
            <li><b>Customize:</b> Use the <span className='bg-indigo-100 text-indigo-700 px-2 py-1 rounded'>Customize Dashboard</span> button to show/hide charts and stats.</li>
            <li><b>Export & Backup:</b> Export analytics or create/restore backups with one click.</li>
            <li><b>Accessibility:</b> Navigate with keyboard, use screen readers, and enjoy a responsive design.</li>
            <li><b>Tooltips:</b> Hover over buttons for quick tips!</li>
          </ol>
          <div className="flex justify-end">
            <button onClick={() => setShowTour(false)} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Got it!</button>
          </div>
        </div>
      </div>
    )
  );

  const renderCharts = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {dashboardPrefs.showTrends && (
        <div className="bg-white p-6 rounded-2xl shadow-lg relative transition-opacity duration-700 opacity-0 animate-fadein" id="trend-chart">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Application Trends</h4>
            <div className="flex gap-2">
              <button onClick={() => exportChartAsImage('trend-chart', 'trend-chart.png')} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Export</button>
              <button onClick={() => printChart('trend-chart')} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200">Print</button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  interval={selectedTimeRange === 'week' ? 0 : selectedTimeRange === 'month' ? 4 : 30}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {dashboardPrefs.showStatus && (
        <div className="bg-white p-6 rounded-2xl shadow-lg relative transition-opacity duration-700 opacity-0 animate-fadein" id="status-chart">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Status Distribution</h4>
            <div className="flex gap-2">
              <button onClick={() => exportChartAsImage('status-chart', 'status-chart.png')} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Export</button>
              <button onClick={() => printChart('status-chart')} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200">Print</button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry: { name: string; percent: number }) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {dashboardPrefs.showCompanies && (
        <div className="bg-white p-6 rounded-2xl shadow-lg relative transition-opacity duration-700 opacity-0 animate-fadein" id="company-chart">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Top Companies</h4>
            <div className="flex gap-2">
              <button onClick={() => exportChartAsImage('company-chart', 'company-chart.png')} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Export</button>
              <button onClick={() => printChart('company-chart')} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200">Print</button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboardStats.topCompanies}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  width={150}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {dashboardPrefs.showResponse && (
        <div className="bg-white p-6 rounded-2xl shadow-lg relative transition-opacity duration-700 opacity-0 animate-fadein" id="response-chart">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Response Time Analysis</h4>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Average Response Time</p>
              <p className="text-2xl font-bold text-blue-600">
                {dashboardStats.averageResponseTime.toFixed(1)} days
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Interview Time</p>
              <p className="text-2xl font-bold text-green-600">
                {dashboardStats.averageInterviewTime.toFixed(1)} days
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Response Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {dashboardStats.responseRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Export dashboard as PDF
  const exportDashboardAsPDF = async () => {
    const dashboard = document.getElementById('dashboard-root');
    if (!dashboard) return;
    const canvas = await html2canvas(dashboard);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('jobgenie-dashboard.pdf');
  };

  // Spinner component
  const Spinner = () => (
    <div className="flex justify-center items-center py-8" role="status" aria-live="polite">
      <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (loading) {
    return (
      <>
        <a href="#main-content" className="sr-only focus:not-sr-only absolute top-2 left-2 bg-blue-700 text-white px-4 py-2 rounded z-50">Skip to Content</a>
        <div className="text-center py-4" role="status" aria-live="polite">Loading applications...</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <a href="#main-content" className="sr-only focus:not-sr-only absolute top-2 left-2 bg-blue-700 text-white px-4 py-2 rounded z-50">Skip to Content</a>
        <div className="text-red-500 text-center py-4" role="alert">{error}</div>
      </>
    );
  }

  if (applications.length === 0) {
    return (
      <>
        <a href="#main-content" className="sr-only focus:not-sr-only absolute top-2 left-2 bg-blue-700 text-white px-4 py-2 rounded z-50">Skip to Content</a>
        <div className="text-center py-4 text-gray-500" id="main-content">No saved applications yet. Create your first application above!</div>
      </>
    );
  }

  if (viewMode === 'dashboard') {
    return (
      <div className="space-y-6" id="dashboard-root">
        {renderTourModal()}
        {renderCustomizeModal()}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Dashboard</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTour(true)}
              className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition shadow"
              title="See a quick overview of the dashboard features"
            >
              Take a Tour
            </button>
            <button
              onClick={() => setShowCustomizeModal(true)}
              className="px-3 py-1 text-sm bg-indigo-500 text-white rounded hover:bg-indigo-600 transition shadow"
            >
              Customize Dashboard
            </button>
            <button
              onClick={exportDashboardAsPDF}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition shadow"
            >
              Export Dashboard as PDF
            </button>
            {renderExportControls()}
            {renderBackupControls()}
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
            >
              Show List
            </button>
          </div>
        </div>
        {isExporting || backupStatus === 'in_progress' ? <Spinner /> : null}
        {renderCharts()}
        {dashboardPrefs.showStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* ... Key Stats ... */}
          </div>
        )}
        {dashboardPrefs.showInsights && (
          <div className="bg-white p-4 rounded-lg shadow transition-opacity duration-700 opacity-0 animate-fadein">
            {/* ... Insights ... */}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">Your Applications</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'dashboard' : 'list')}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            {viewMode === 'list' ? 'Show Dashboard' : 'Show List'}
          </button>
          <button
            onClick={toggleSelectAll}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
          >
            {selectedApps.size === filteredAndSortedApplications.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </div>

      {showBulkActions && (
        <div className="bg-white p-4 rounded-lg shadow space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedApps.size} application{selectedApps.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <select
                onChange={(e) => handleBulkStatusChange(e.target.value as ApplicationStatus)}
                className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Change Status</option>
                <option value="draft">Draft</option>
                <option value="applied">Applied</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
                <option value="accepted">Accepted</option>
              </select>
              <button
                onClick={handleBulkExport}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition"
              >
                Export Selected
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow space-y-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Applications
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in resume, job description, company, position, notes, reminders, or tags..."
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'all')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="applied">Applied</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
                <option value="accepted">Accepted</option>
              </select>
            </div>
            <div>
              <label htmlFor="sortField" className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                id="sortField"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="createdAt">Created Date</option>
                <option value="updatedAt">Updated Date</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={toggleSortOrder}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
              >
                {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 rounded-full text-sm transition ${
                      selectedTags.has(tag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredAndSortedApplications.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No applications match your search criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedApplications.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={selectedApps.has(app.id!)}
                      onChange={() => toggleSelect(app.id!)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <h4 className="font-medium text-gray-900">
                      {app.companyName || 'Unnamed Company'} - {app.position || 'Unspecified Position'}
                    </h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[app.status]}`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(app.createdAt).toLocaleDateString()}
                    {app.updatedAt && app.updatedAt !== app.createdAt && (
                      <span className="ml-2">
                        (Updated: {new Date(app.updatedAt).toLocaleDateString()})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={app.status}
                    onChange={(e) => handleStatusChange(app.id!, e.target.value as ApplicationStatus)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="applied">Applied</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                    <option value="accepted">Accepted</option>
                  </select>
                  <button
                    onClick={() => onEdit(app)}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => exportToPDF(app)}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => handleDelete(app.id!)}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => toggleExpand(app.id!)}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                  >
                    {expandedId === app.id ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              {expandedId === app.id && (
                <div className="mt-4 space-y-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Resume Details:</h5>
                    <p className="text-gray-600 whitespace-pre-wrap">{app.resumeDetails}</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Job Description:</h5>
                    <p className="text-gray-600 whitespace-pre-wrap">{app.jobDescription}</p>
                  </div>
                  
                  {/* Tags Section */}
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Tags</h5>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {app.tags?.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(app.id!, tag)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a tag..."
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleAddTag(app.id!)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Notes</h5>
                    <div className="space-y-2 mb-4">
                      {app.notes?.map(note => (
                        <div key={note.id} className="flex justify-between items-start bg-gray-50 p-2 rounded">
                          <div>
                            <p className="text-gray-600">{note.content}</p>
                            <p className="text-xs text-gray-400">
                              Added: {new Date(note.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteNote(app.id!, note.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a note..."
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleAddNote(app.id!)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                      >
                        Add Note
                      </button>
                    </div>
                  </div>

                  {/* Reminders Section */}
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Reminders</h5>
                    <div className="space-y-2 mb-4">
                      {app.reminders?.map(reminder => (
                        <div key={reminder.id} className="flex justify-between items-start bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={reminder.completed}
                              onChange={() => toggleReminder(app.id!, reminder.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div>
                              <p className={`text-gray-600 ${reminder.completed ? 'line-through' : ''}`}>
                                {reminder.title}
                              </p>
                              <p className="text-xs text-gray-400">
                                Due: {new Date(reminder.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteReminder(app.id!, reminder.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newReminder.title}
                        onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Reminder title..."
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="date"
                        value={newReminder.dueDate}
                        onChange={(e) => setNewReminder(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleAddReminder(app.id!)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                      >
                        Add Reminder
                      </button>
                    </div>
                  </div>

                  {/* Timeline Section */}
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Timeline</h5>
                    <div className="mb-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setTimelineView('all')}
                          className={`px-3 py-1 rounded ${
                            timelineView === 'all'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setTimelineView('status')}
                          className={`px-3 py-1 rounded ${
                            timelineView === 'status'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Status Changes
                        </button>
                        <button
                          onClick={() => setTimelineView('notes')}
                          className={`px-3 py-1 rounded ${
                            timelineView === 'notes'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Notes
                        </button>
                        <button
                          onClick={() => setTimelineView('reminders')}
                          className={`px-3 py-1 rounded ${
                            timelineView === 'reminders'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Reminders
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      {app.timeline
                        ?.filter(event => {
                          switch (timelineView) {
                            case 'status':
                              return event.type === 'status_change';
                            case 'notes':
                              return event.type === 'note_added';
                            case 'reminders':
                              return event.type === 'reminder_added' || event.type === 'reminder_completed';
                            default:
                              return true;
                          }
                        })
                        .sort((a, b) => b.date.getTime() - a.date.getTime())
                        .map(event => (
                          <div key={event.id} className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                            <div className={`w-2 h-2 mt-2 rounded-full ${
                              event.type === 'status_change' ? 'bg-blue-500' :
                              event.type === 'note_added' ? 'bg-green-500' :
                              event.type === 'reminder_added' ? 'bg-yellow-500' :
                              event.type === 'reminder_completed' ? 'bg-purple-500' :
                              'bg-gray-500'
                            }`}></div>
                            <div>
                              <p className="text-gray-800 font-medium">{event.title}</p>
                              {event.description && (
                                <p className="text-gray-600 text-sm">{event.description}</p>
                              )}
                              <p className="text-xs text-gray-400">
                                {new Date(event.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTimelineEvent.title}
                        onChange={(e) => setNewTimelineEvent(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Event title..."
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={newTimelineEvent.description}
                        onChange={(e) => setNewTimelineEvent(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Event description (optional)..."
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleAddTimelineEvent(app.id!)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                      >
                        Add Event
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 