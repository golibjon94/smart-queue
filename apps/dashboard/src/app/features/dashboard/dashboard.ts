import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { DashboardStore } from './data/dashboard-store';
import { AnomaliesPanel } from './ui/anomalies-panel/anomalies-panel';
import { CountersPanel } from './ui/counters-panel/counters-panel';
import { DashboardHeader } from './ui/dashboard-header/dashboard-header';
import { FeedbackPanel } from './ui/feedback-panel/feedback-panel';
import { ForecastChart } from './ui/forecast-chart/forecast-chart';
import { KpiCards } from './ui/kpi-cards/kpi-cards';
import { QrJoinCard } from './ui/qr-join-card/qr-join-card';
import { QueuesTable } from './ui/queues-table/queues-table';
import { VirtualTicketsPanel } from './ui/virtual-tickets-panel/virtual-tickets-panel';
import { WhatifPanel } from './ui/whatif-panel/whatif-panel';
import {
  RecommendationDecision,
  RecommendationsPanel,
} from './ui/recommendations-panel/recommendations-panel';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DashboardStore],
  imports: [
    DashboardHeader,
    KpiCards,
    CountersPanel,
    QueuesTable,
    ForecastChart,
    RecommendationsPanel,
    AnomaliesPanel,
    WhatifPanel,
    QrJoinCard,
    VirtualTicketsPanel,
    FeedbackPanel,
  ],
  host: { class: 'block' },
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly store = inject(DashboardStore);
  protected readonly branchId = environment.branchId;

  onRespond({ recId, status }: RecommendationDecision): void {
    this.store.respond(recId, status);
  }

  onSimulate(openCounters: number): void {
    this.store.simulate(openCounters);
  }

  onFeedback({ rating, comment }: { rating: number; comment: string }): void {
    this.store.submitFeedback(rating, comment);
  }

  onRefreshTickets(): void {
    this.store.refreshVirtualTickets();
  }
}
