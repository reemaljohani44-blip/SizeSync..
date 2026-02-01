import { analyzeSizeChart } from "./openai";
import type { Profile } from "@shared/schema";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface AnalysisJob {
  id: string;
  status: JobStatus;
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface JobData {
  imageBase64: string;
  profile: Profile;
  clothingType: string;
  fabricType: string;
  profileId: string;
}

const jobs = new Map<string, AnalysisJob>();
const jobData = new Map<string, JobData>();

const JOB_CLEANUP_INTERVAL = 10 * 60 * 1000;
const JOB_MAX_AGE = 30 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  const entries = Array.from(jobs.entries());
  entries.forEach(([id, job]) => {
    if (now - job.createdAt.getTime() > JOB_MAX_AGE) {
      jobs.delete(id);
      jobData.delete(id);
    }
  });
}, JOB_CLEANUP_INTERVAL);

export function createJob(id: string, data: JobData): AnalysisJob {
  const job: AnalysisJob = {
    id,
    status: "pending",
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  jobs.set(id, job);
  jobData.set(id, data);
  
  processJob(id);
  
  return job;
}

export function getJob(id: string): AnalysisJob | undefined {
  return jobs.get(id);
}

async function processJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  const data = jobData.get(jobId);
  
  if (!job || !data) return;
  
  job.status = "processing";
  job.progress = 10;
  job.updatedAt = new Date();
  
  try {
    job.progress = 30;
    job.updatedAt = new Date();
    
    const result = await analyzeSizeChart(
      data.imageBase64,
      data.profile,
      data.clothingType,
      data.fabricType
    );
    
    job.progress = 100;
    job.status = "completed";
    job.result = {
      ...result,
      profileId: data.profileId,
      clothingType: data.clothingType,
      fabricType: data.fabricType,
    };
    job.updatedAt = new Date();
    
    jobData.delete(jobId);
    
  } catch (error: any) {
    job.status = "failed";
    job.error = error.message || "Analysis failed";
    job.updatedAt = new Date();
    
    jobData.delete(jobId);
  }
}
