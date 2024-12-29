import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ChordDiagnostic from '../components/ChordDiagnostic';
import ChordStatistics from '../components/ChordStatistics';
import CC1ChordGenerator from '../components/CC1ChordGenerator';
import ChordViewer from '../components/ChordViewer';
import ToleranceRecommender from '../components/ToleranceRecommender';

function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

CustomTabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
};

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

function ChordTools({ chordLibrary, setChordLibrary }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Local state to keep track of current tab
    const [value, setValue] = useState(0);

    // On initial render or if location.search changes, read ?tab=xxx
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const tabParam = searchParams.get('tab');

        if (tabParam !== null) {
            const parsedTab = parseInt(tabParam, 10);
            if (!isNaN(parsedTab)) {
                setValue(parsedTab);
            }
        }
    }, [location.search]);

    // When user clicks a different tab, update both the local state and the URL
    const handleChange = (event, newValue) => {
        setValue(newValue);
        navigate(
            {
                pathname: '/chord-tools',
                search: `?tab=${newValue}`,
            },
            { replace: true } // avoids pushing new history entries
        );
    };

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                Chord Tools
            </Typography>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={value} onChange={handleChange} aria-label="Chord tools">
                    <Tab label="Chord Viewer" {...a11yProps(0)} />
                    <Tab label="Chord Statistics" {...a11yProps(1)} />
                    <Tab label="CC1 Chord Generator" {...a11yProps(2)} />
                    <Tab label="Chord Timing Diagnostic Tool" {...a11yProps(3)} />
                    <Tab label="Chord Tolerance Recommender" {...a11yProps(4)} />
                </Tabs>
            </Box>

            <CustomTabPanel value={value} index={0}>
                <ChordViewer chordLibrary={chordLibrary} setChordLibrary={setChordLibrary} />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
                <ChordStatistics chordLibrary={chordLibrary} />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={2}>
                <CC1ChordGenerator chordLibrary={chordLibrary} />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={3}>
                <ChordDiagnostic />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={4}>
                <ToleranceRecommender />
            </CustomTabPanel>
        </div>
    );
}

ChordTools.propTypes = {
    chordLibrary: PropTypes.array,
    setChordLibrary: PropTypes.func,
};

export default ChordTools;