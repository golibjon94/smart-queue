import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DashboardStore } from './data/dashboard-store';
import { AnomaliesPanel } from './ui/anomalies-panel/anomalies-panel';
import { CountersPanel } from './ui/counters-panel/counters-panel';
import { DashboardHeader } from './ui/dashboard-header/dashboard-header';
import { ForecastChart } from './ui/forecast-chart/forecast-chart';
import { KpiCards } from './ui/kpi-cards/kpi-cards';
import { QueuesTable } from './ui/queues-table/queues-table';
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
  ],
  host: { class: 'block' },
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly store = inject(DashboardStore);

  onRespond({ recId, status }: RecommendationDecision): void {
    this.store.respond(recId, status);
  }
}
