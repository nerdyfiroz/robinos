export type TaskType =
  | 'Follow'
  | 'Like'
  | 'Repost'
  | 'Comment'
  | 'Quote Post'
  | 'Visit Link'
  | 'Join Discord'
  | 'Join Telegram'
  | 'Custom';

export type ApplicantStatus =
  | 'Pending'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Waitlisted';

export type TaskVerificationStatus = 'Completed' | 'Verified' | 'Rejected' | 'Needs Review';

export interface QuestTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  task_url: string;
  proof_required: boolean;
  required: boolean;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ApplicantTaskRecord {
  id: string;
  applicant_id: string;
  task_id: string;
  task_title?: string;
  task_type?: TaskType;
  proof_url?: string;
  status: TaskVerificationStatus;
  verified_at?: string | null;
  created_at: string;
}

export interface Applicant {
  id: string;
  application_id: string; // e.g. "RB-849210"
  wallet_address: string;
  x_username: string;
  x_profile_url: string;
  status: ApplicantStatus;
  allocation?: string | null; // e.g. "1 NFT", "5 NFTs"
  notes?: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
  tasks?: ApplicantTaskRecord[];
  completion_rate?: number; // e.g. 100 for 100%
  completed_tasks_count?: number;
  total_required_tasks_count?: number;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_type: 'applicant' | 'task' | 'settings' | 'auth' | 'system';
  target_id: string;
  previous_value?: string;
  new_value?: string;
  created_at: string;
}

export interface CollectionSettings {
  name: string;
  supply: number;
  mint_price: string;
  chain: string;
  launch_date: string;
  x_url: string;
  opensea_status: string;
  opensea_url: string;
}

export interface EarlyAccessSettings {
  is_open: boolean;
  max_applications: number;
  default_allocation: string;
  submission_cooldown_sec: number;
  captcha_enabled: boolean;
}

export interface QuestSettings {
  default_proof_required: boolean;
  required_task_behavior: string;
  min_tasks_required: number;
}

export interface PlatformSettings {
  collection: CollectionSettings;
  early_access: EarlyAccessSettings;
  quests: QuestSettings;
}

export interface DashboardStats {
  total_applicants: number;
  pending: number;
  approved: number;
  rejected: number;
  under_review: number;
  waitlisted: number;
  todays_applications: number;
  completed_applications: number;
  duplicate_attempts: number;
  daily_trends: { date: string; count: number; approved: number }[];
  task_completion_stats: { task_id: string; title: string; count: number }[];
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'reviewer';
  created_at: string;
}

export interface SubmitApplicationPayload {
  wallet_address: string;
  x_username: string;
  x_profile_url?: string;
  tasks: {
    task_id: string;
    proof_url?: string;
    completed: boolean;
  }[];
}
