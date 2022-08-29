import PropTypes from 'prop-types';
import React from 'react';
import { Tab, Button, Icon } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { withTranslation } from 'react-i18next';

import KeyMetrics from './KeyMetrics';
import ReportTable from './ReportTable';
import PredictionTable from './PredictionTable';


import { reportToCsv } from '../../../../lib/nlu.utils';

class IntentReport extends React.Component {
    getPanes() {
        const { report, predictions, t } = this.props;
        const tabs = [{
            menuItem: t('Detailed Report'),
            render: () => <ReportTable report={report} labelType='intent' />,
        }];
        if (predictions && predictions.length) {
            tabs.push(
                {
                    menuItem: t('Misclassifications'),
                    render: () => <PredictionTable predictions={predictions} labelType='intent' />,
                },
            );
        }
        return tabs;
    }

    exportReport() {
        const { predictions } = this.props;
        const csvData = reportToCsv(predictions);
        const date = (new Date()).toISOString();
        saveAs(new Blob([csvData]), `intent_report_${date}.csv`);
    }

    render() {
        const {
            accuracy, precision, t, f1_score: f1,
        } = this.props;

        return (
            <div>
                <br />
                <KeyMetrics
                    accuracy={accuracy}
                    precision={precision}
                    f1={f1}
                />
                <br />
                <br />
                <Button type='submit' basic fluid color='blue' onClick={() => this.exportReport()} data-cy='export-evaluation-results'>
                    <Icon name='download' />
                    {t('Download report')}
                </Button>
                <br />
                <Tab
                    menu={{ pointing: true, secondary: true }}
                    panes={this.getPanes()}
                />
            </div>
        );
    }
}

IntentReport.propTypes = {
    report: PropTypes.object.isRequired,
    accuracy: PropTypes.number.isRequired,
    precision: PropTypes.number.isRequired,
    f1_score: PropTypes.number.isRequired,
    predictions: PropTypes.array.isRequired,
};

export default withTranslation('nlu')(IntentReport);
