import React from 'react';
import PropTypes from 'prop-types';
import { Popup } from 'semantic-ui-react';
import { withTranslation } from "react-i18next";

const BadLineLabel = (props) => {
    const { lineMd, lineIndex } = props;
    const { t } = this.props;
    return (
        <Popup
            on='click'
            trigger={(
                <div className='label-container black'>
                    <div>bad line</div>
                    <div>
                        {lineMd}
                    </div>
                </div>
            )}
            header={t(`Bad line on line ${lineIndex}`)}
            content={<p>t(Please fix this line in YAML mode)</p>}
        />
    );
};

BadLineLabel.propTypes = {
    lineMd: PropTypes.string,
    lineIndex: PropTypes.number.isRequired,
};

BadLineLabel.defaultProps = {
    lineMd: '',
};

export default withTranslation('stories')(BadLineLabel);
