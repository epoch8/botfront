import React from 'react';
import PropTypes from 'prop-types';
import matchSorter from 'match-sorter';
import ReactTable from 'react-table-v6';
import { Popup, Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

function ReportTable(props) {
    const { labelType } = props;
    const { t } = useTranslation('nlu');

    const getReportData = () => {
        const { report } = props;
        if (!report) return [];
        return Object.keys(report).reduce((acc, key) => {
            if (['micro avg', 'macro avg', 'weighted avg', 'accuracy'].includes(key)) return acc;
            return [...acc, { [labelType]: key, ...report[key] }];
        }, []);
    };

    const getReportColumns = () => [
        {
            accessor: labelType,
            Header: labelType.charAt(0).toUpperCase() + labelType.slice(1),
            filterMethod: (filter, rows) => matchSorter(rows, filter.value, { keys: [labelType] }),
            className: 'left',
            filterAll: true,
        },
        {
            accessor: 'f1-score',
            Header: () => (
                <div>
                    {t('F1-Score')}{' '}
                    <Popup
                        trigger={<Icon name='question circle' color='grey' />}
                        content={t('A general measure of the quality of your model based on precision and accuracy')}
                    />
                </div>
            ),
            filterable: false,
            width: 100,
        },
        {
            accessor: 'precision',
            Header: () => (
                <div>
                    {t('Precision')}{' '}
                    <Popup
                        trigger={<Icon name='question circle' color='grey' />}
                        content={t('On 100 predictions for label, how many were actually labeled as such in test set')}
                    />
                </div>
            ),
            filterable: false,
            width: 100,
        },
        {
            accessor: 'recall',
            Header: () => (
                <div>
                    {t('Recall')}{' '}
                    <Popup
                        trigger={<Icon name='question circle' color='grey' />}
                        content={t('On 100 instances of label in test set, how many were actually predicted')}
                    />
                </div>
            ),
            filterable: false,
            width: 100,
        },
        {
            accessor: 'support',
            Header: () => (
                <div>
                    {t('Support')}{' '}
                    <Popup
                        trigger={<Icon name='question circle' color='grey' />}
                        content={t('The number of examples for that label')}
                    />
                </div>
            ),
            filterable: false,
            width: 100,
        },
    ];

    return (
        <ReactTable
            data={getReportData()}
            filterable
            columns={getReportColumns()}
            minRows={1}
            SubComponent={null}
        />
    );
}

ReportTable.propTypes = {
    report: PropTypes.object.isRequired,
    labelType: PropTypes.string.isRequired,
};

export default ReportTable;
