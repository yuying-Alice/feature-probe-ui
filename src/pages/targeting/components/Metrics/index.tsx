import { useEffect, useMemo, useCallback, useState, SyntheticEvent, useRef } from 'react';
import { Select, DropdownProps } from 'semantic-ui-react';
import { Line } from 'react-chartjs-2';
import { useParams } from 'react-router-dom';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
  Chart,
} from 'chart.js';
import { FormattedMessage, useIntl } from 'react-intl';
import message from 'components/MessageBox';
import Icon from 'components/Icon';
import { VariationColors } from 'constants/colors';
import { createChartOptions } from './chartOption';
import { createChartData } from './chartData';
import { options } from './constants';
import { IRouterParams } from 'interfaces/project';
import { IMetric, IValues, IMetricContent } from 'interfaces/targeting';
import { getMetrics } from 'services/toggle';

import styles from './index.module.scss';

const Metrics = () => {
  const [ metrics, setMetric ] = useState<IMetric[]>([]);
  const [ summary, setSummary ] = useState<IValues[]>([]);
  const [ filterValue, setFilterValue ] = useState<string>('24');
  const [ total, setTotal ] = useState<number>(0);
  const { projectKey, environmentKey, toggleKey } = useParams<IRouterParams>();
  const intl = useIntl();
  const timer: { current: NodeJS.Timeout | null } = useRef(null);

  const initMetrics = useCallback(() => {
    getMetrics<IMetricContent>(projectKey, environmentKey, toggleKey, {
      lastHours: filterValue,
    }).then(res => {
      const { data, success } = res;
      if (success && data) {
        setMetric(data.metrics || []);
        setSummary(data.summary || []);

        let count = 0;
        data.summary?.forEach((item: IValues) => {
          count += item.count;
        });
        setTotal(count);
      } else {
        message.error(res.message || intl.formatMessage({id: 'targeting.metrics.error.text'}));
      }
    });
  }, [intl, projectKey, environmentKey, toggleKey, filterValue]);

  useEffect(() => {
    if (timer.current) {
      clearInterval(timer.current);
    }
    initMetrics();
    timer.current = setInterval(initMetrics, 5000);
    
    return () => {
      clearInterval(timer.current as NodeJS.Timeout);
    }
  }, [initMetrics, filterValue]);

  const chartOptions = useMemo(() => {
    return createChartOptions();
  }, []);

  const chartData = useMemo(() => {
    return createChartData(metrics, summary);
  }, [metrics, summary]);

  const handleSelectChange = useCallback((e: SyntheticEvent, detail: DropdownProps) => {
    // @ts-ignore
    setFilterValue(detail.value || '24');
  }, []);

  const handleGotoSDK = useCallback(() => {
    // TODO:
    window.open('https://github.com/FeatureProbe/FeatureProbe');
  }, []);

	return (
		<div className={styles.metrics}>
      <div className={styles.title}>
        <div className={styles['title-text']}>
          <FormattedMessage id='common.evaluations.text' />
        </div>
        <div>
          <Select
            floating
            value={filterValue}
            placeholder={intl.formatMessage({id: 'common.dropdown.placeholder'})}
            className={styles['title-select']}
            options={options}
            onChange={handleSelectChange}
            icon={<Icon customClass={styles['angle-down']} type='angle-down' />}
          />
        </div>
      </div>
      {
         summary.length > 0 ? (
          <div className={styles.content}>
            <div className={styles.variations}>
              <div className={styles['table-header']}>
                <div>
                  <FormattedMessage id='targeting.variations.evaluations.text' />
                </div>
                { 
                  total !== 0 && <div className={styles.total}>
                    { total }
                  </div> 
                }
              </div>
              <div className={styles['table-content']}>
                {
                  summary?.map((item: IValues, index: number) => {
                    return (
                      <div className={styles['variation-name']}>
                        <span style={{ background: VariationColors[index % 24] }} className={styles['variation-name-color']}></span>
                        <span className={styles['variation-name-text']}>
                          { item.value }
                        </span>
                        <span className={styles.count}>
                          { item.count }
                        </span>
                      </div>
                    )
                  })
                }
              </div>
            </div>
            <div className={styles.chart}>
              <Line
                height={0}
                options={chartOptions}
                data={chartData}
              />
            </div>
          </div>
        ) : (
          <div className={styles['no-data']}>
            <div>
              <img className={styles['no-data-image']} src={require('images/no-data.png')} alt='no-data' />
            </div>
            <div className={styles['no-data-text']}>
              <FormattedMessage id='targeting.metrics.no.data.text' />
            </div>
            <div className={styles['no-data-text']}>
              <span className={styles['no-data-link']} onClick={handleGotoSDK}>
                <FormattedMessage id='targeting.metrics.link.sdk.text' />
              </span>
              <FormattedMessage id='targeting.metrics.no.data.tips' />
            </div>
          </div>
        )
      }
		</div>
	)
}

export default Metrics;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Legend,
  Tooltip,
  {
    id: Date.now().toString(),
    afterDraw: (chart: Chart) => {
      // @ts-ignore
      if (chart.tooltip._active && chart.tooltip._active.length) {
        // @ts-ignore
        const activePoint = chart.tooltip._active[0];
        const ctx = chart.ctx;
        const x = activePoint.element.x;
        const topY = chart.scales.y.top;
        const bottomY = chart.scales.y.bottom;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#CED4DA';
        ctx.stroke();
        ctx.restore();
      }
    }
  }
);