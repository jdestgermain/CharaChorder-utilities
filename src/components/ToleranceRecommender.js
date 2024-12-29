import React, { useState, useEffect } from 'react';
import {
    Button,
    Container,
    Typography,
    Box,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';

/**
 * Winsorize an array by clamping values to the lowerPercentile and upperPercentile.
 * For example, (0.05, 0.95) would clamp the bottom 5% and top 5%.
 */
function winsorize(array, lowerPercent = 0.05, upperPercent = 0.95) {
    if (!array.length) return [];
    const sorted = [...array].sort((a, b) => a - b);
    const n = sorted.length;
    const lowerIndex = Math.floor(n * lowerPercent);
    const upperIndex = Math.floor(n * upperPercent);
    const lowerVal = sorted[lowerIndex];
    const upperVal = sorted[Math.min(upperIndex, n - 1)];

    return sorted.map((v) => Math.max(lowerVal, Math.min(v, upperVal)));
}


/**
 * Compute the mean of a winsorized array.
 */
function winsorizedMean(array, lowerPercent = 0.05, upperPercent = 0.95) {
    if (!array.length) return 0;
    const w = winsorize(array, lowerPercent, upperPercent);
    if (!w.length) return 0;
    const sum = w.reduce((acc, val) => acc + val, 0);
    return sum / w.length;
}

/**
 * Analyzes a single attempt:
 * - pressDifference (ms) = time between first & last keyDown
 * - releaseDifference (ms) = time between first & last keyUp
 * - scaled by (difference / numberOfKeys)
 */
function analyzeAttempt(events) {
    if (!events || !events.length) {
        return {
            pressDifference: 0,
            releaseDifference: 0,
            pressDifferenceScaled: 0,
            releaseDifferenceScaled: 0,
            keysPressed: 0,
        };
    }

    const sorted = [...events].sort((a, b) => a.time - b.time);

    let firstPressTime = null;
    let lastPressTime = null;
    let firstReleaseTime = null;
    let lastReleaseTime = null;
    const pressedKeyCodes = new Set();

    sorted.forEach(({ event, time }) => {
        if (event.type === 'keydown') {
            if (firstPressTime === null) {
                firstPressTime = time;
            }
            lastPressTime = time;
            pressedKeyCodes.add(event.code);
        } else if (event.type === 'keyup') {
            if (firstReleaseTime === null) {
                firstReleaseTime = time;
            }
            lastReleaseTime = time;
        }
    });

    const pressDifference =
        (lastPressTime ?? 0) - (firstPressTime ?? 0);
    const releaseDifference =
        (lastReleaseTime ?? 0) - (firstReleaseTime ?? 0);

    const keysCount = pressedKeyCodes.size || 1; // avoid /0
    const pressDifferenceScaled = pressDifference / keysCount;
    const releaseDifferenceScaled = releaseDifference / keysCount;

    return {
        pressDifference,
        releaseDifference,
        pressDifferenceScaled,
        releaseDifferenceScaled,
        keysPressed: pressedKeyCodes.size,
    };
}

const ToleranceRecommender = () => {
    // Completed attempts (array of arrays)
    const [attempts, setAttempts] = useState([]);
    // Current attempt in progress
    const [currentAttempt, setCurrentAttempt] = useState([]);
    // Track keys currently down
    const [pressedKeys, setPressedKeys] = useState(new Set());

    const [attemptSummaries, setAttemptSummaries] = useState([]);
    // Our final recommended tolerance (median-based + WPM clamp)
    const [recommendations, setRecommendations] = useState({
        pressMedian: 0,
        releaseMedian: 0,
        recommendedPress: 0,
        recommendedRelease: 0,
    });

    const [textFieldValue, setTextFieldValue] = useState('');
    // Field where user inputs typical WPM for normal typing
    const [wpm, setWpm] = useState('80');

    /**
     * handleKeyEvents - capture keydown/keyUp
     */
    const handleKeyEvents = (event) => {
        const now = performance.now();
        setCurrentAttempt((prev) => [...prev, { event, time: now }]);

        if (event.type === 'keydown') {
            setPressedKeys((prev) => {
                const copy = new Set(prev);
                copy.add(event.code);
                return copy;
            });
        } else if (event.type === 'keyup') {
            setPressedKeys((prev) => {
                const copy = new Set(prev);
                copy.delete(event.code);
                return copy;
            });
        }
    };

    const handleTextChange = (e) => {
        setTextFieldValue(e.target.value);
    };

    /**
     * When pressedKeys becomes empty, finalize the attempt.
     * Also clear typed text so we don't accumulate "wtwtwtwt..."
     */
    useEffect(() => {
        if (pressedKeys.size === 0 && currentAttempt.length > 0) {
            // Finalize attempt
            setAttempts((prev) => [...prev, currentAttempt]);
            setCurrentAttempt([]);
            setTextFieldValue('');

            // Now that we added a new attempt, we can either
            // compute recommendations here immediately or
            // wait for attemptSummaries to re-render.
            setTimeout(() => {
                computeRecommendations();
            }, 0);
        } // eslint-disable-next-line
    }, [pressedKeys, currentAttempt]);

    /**
     * Recompute attemptSummaries whenever attempts changes
     */
    useEffect(() => {
        if (!attempts.length) {
            setAttemptSummaries([]);
            return;
        }
        const summaries = attempts.map((att) => analyzeAttempt(att));
        setAttemptSummaries(summaries);
    }, [attempts]);

    /**
     * Compute median-based (scaled) recommendations,
     * clamp them by user’s typing speed if provided.
     */
    const computeRecommendations = () => {
        if (!attemptSummaries.length) {
            return;
        }

        // Gather scaled press & release differences
        let pressScaled = attemptSummaries.map((s) => s.pressDifferenceScaled);
        let releaseScaled = attemptSummaries.map((s) => s.releaseDifferenceScaled);

        // Compute winsorized means (5%-95%)
        const pressMeanVal = winsorizedMean(pressScaled, 0.05, 0.95);
        const releaseMeanVal = winsorizedMean(releaseScaled, 0.05, 0.95);

        // Add small buffer of 7 ms
        let recommendedPressBase = Math.ceil(pressMeanVal + 7);
        let recommendedReleaseBase = Math.ceil(releaseMeanVal + 7);

        // 4. If user provided WPM, clamp to a safe threshold
        // Typical formula: average inter-keystroke time = 60000 / (5 * WPM) ms
        // Then pick 50% or so as a "safe" max for single-letter typing
        let computedIKIMs = null;  // IKI = inter-keystroke interval
        let usedSafeMax = null;
        const numericWpm = parseFloat(wpm) || 0;
        if (numericWpm > 0) {
            const averageMsPerKeystroke = 60000 / (5 * numericWpm);
            // e.g. 100 WPM => 60000/(5*100)=60000/500=120ms per keystroke on average
            const safeMax = 0.5 * averageMsPerKeystroke;
            // 50% of that, to avoid accidental chords if they burst to a higher speed
            computedIKIMs = averageMsPerKeystroke;
            usedSafeMax = safeMax/2;
            // Final recommended press = min of chord-based vs. safe max / 2, because 2 keys= 2*press tolerance is timing
            recommendedPressBase = Math.min(recommendedPressBase, Math.floor(safeMax/2));
        }

        // Final set
        setRecommendations({
            pressMedian: pressMeanVal,         // or rename key to pressMean if you prefer
            releaseMedian: releaseMeanVal,
            recommendedPress: recommendedPressBase,
            recommendedRelease: recommendedReleaseBase,
            averageMsKeystroke: computedIKIMs,
            safeMaxUsed: usedSafeMax,
        });
    };

    const handleReset = () => {
        setAttempts([]);
        setCurrentAttempt([]);
        setPressedKeys(new Set());
        setAttemptSummaries([]);
        setTextFieldValue('');
        setWpm('80');
        setRecommendations({
            pressMedian: 0,
            releaseMedian: 0,
            recommendedPress: 0,
            recommendedRelease: 0,
        });
    };

    return (
        <Container sx={{ marginTop: 4 }}>
            <Typography variant="h4" gutterBottom>
                Chord Tolerance Recommender
            </Typography>
            <Typography paragraph>
                This tool helps you dial in suggested{' '}
                <a href="https://docs.charachorder.com/GenerativeTextMenu.html#press-tolerance">
                    Press
                </a>{' '}
                and{' '}
                <a href="https://docs.charachorder.com/GenerativeTextMenu.html#release-tolerance">
                    Release
                </a>{' '}
                tolerances for your CharaChorder. First, turn off chording on
                your device. Then pick a few chords of varying lengths (e.g. 3-key,
                4-key) and chord each chord multiple times in the box below.
                As you chord, the recommended values will be computed and shown.
            </Typography>

            <Box display="flex" gap="1rem" alignItems="center" marginBottom="1rem">
                <TextField
                    label="Type chord here"
                    variant="outlined"
                    value={textFieldValue}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyEvents}
                    onKeyUp={handleKeyEvents}
                />
                <TextField
                    label="Average typing speed (WPM)"
                    variant="outlined"
                    type="number"
                    value={wpm}
                    onChange={(e) => setWpm(e.target.value)}
                    sx={{ width: 200 }}
                />
                <Button variant="contained" onClick={handleReset}>
                    Reset
                </Button>
            </Box>

            <Typography variant="h6" gutterBottom>
                Chords recorded: {attempts.length}
            </Typography>

            {attemptSummaries.length > 0 && recommendations.recommendedPress > 0 && (
                <Box component={Paper} sx={{ padding: 2, marginTop: 2 }}>
                    <Typography variant="h6">Recommendations</Typography>
                    <Box marginTop={2}>
                        <Typography color="primary">
                            Press Tolerance: {recommendations.recommendedPress} ms
                        </Typography>
                        <Typography color="primary">
                            Release Tolerance: {recommendations.recommendedRelease} ms
                        </Typography>
                    </Box>
                    <Box marginTop={2}>
                        <Typography variant="body2">
                            <em>Note:</em>{' '}
                            Because of chord scaling, if you press 2 keys with a Press Tolerance of{' '}
                            {recommendations.recommendedPress} ms, the actual chord window is{' '}
                            {2 * recommendations.recommendedPress} ms total.{' '}

                            {recommendations.averageMsKeystroke && (
                                <>
                                    We computed your <strong>average inter-keystroke interval</strong> at about{' '}
                                    {recommendations.averageMsKeystroke.toFixed(1)} ms based on {wpm} WPM,
                                    then assumed you may burst to <strong>2× that speed</strong>. Combining that with a potential 2 keys overlapping, we
                                    clamped your Press Tolerance to <strong>
                                        {recommendations.safeMaxUsed?.toFixed(1)} ms
                                    </strong> to minimize accidental chords when typing quickly.
                                </>
                            )}
                        </Typography>
                    </Box>
                </Box>
            )}

            {attemptSummaries.length > 0 && (
                <Box component={Paper} sx={{ padding: 2, marginTop: 2 }}>
                    <Typography variant="subtitle1">Chord Details</Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Attempt #</TableCell>
                                <TableCell>Press Diff (ms)</TableCell>
                                <TableCell>Release Diff (ms)</TableCell>
                                <TableCell>Keys Pressed</TableCell>
                                <TableCell>Press Diff (scaled, ms/key)</TableCell>
                                <TableCell>Release Diff (scaled, ms/key)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {attemptSummaries.map((s, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell>{s.pressDifference.toFixed(2)}</TableCell>
                                    <TableCell>{s.releaseDifference.toFixed(2)}</TableCell>
                                    <TableCell>{s.keysPressed}</TableCell>
                                    <TableCell>{s.pressDifferenceScaled.toFixed(2)}</TableCell>
                                    <TableCell>{s.releaseDifferenceScaled.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            )}
            {attemptSummaries.length > 0 && recommendations.recommendedPress > 0 && (
                <Box component={Paper} sx={{ padding: 2, marginTop: 2 }}>
                    <Box marginTop={1}>
                        <Typography>
                            Press mean (scaled): {recommendations.pressMedian.toFixed(2)} ms/key
                        </Typography>
                        <Typography>
                            Release mean (scaled): {recommendations.releaseMedian.toFixed(2)} ms/key
                        </Typography>
                    </Box>
                </Box>
            )}
        </Container>
    );
};

export default ToleranceRecommender;