import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { DashboardData } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  getOverview() {
    return this.api.get<DashboardData>('/attendance/dashboard');
  }
}
