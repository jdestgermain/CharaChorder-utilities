import * as React from 'react';
import { AppBar, Box, Toolbar, Typography, Menu, MenuItem, Container, Button, Tooltip } from '@mui/material';
import { Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText, Input } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardAltIcon from '@mui/icons-material/KeyboardAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import { Link } from 'react-router-dom';

const pages = ['Word Tools', 'Chord Tools', 'Practice', 'CCX Debugging'];

const actionCodes = {
    32: ' ',
    33: '!',
    34: '"',
    35: '#',
    36: '$',
    37: '%',
    38: '&',
    39: '\'',
    40: '(',
    41: ')',
    42: '*',
    43: '+',
    44: ',',
    45: '-',
    46: '.',
    47: '/',
    48: '0',
    49: '1',
    50: '2',
    51: '3',
    52: '4',
    53: '5',
    54: '6',
    55: '7',
    56: '8',
    57: '9',
    58: ':',
    59: ';',
    60: '<',
    61: '=',
    62: '>',
    63: '?',
    64: '@',
    65: 'A',
    66: 'B',
    67: 'C',
    68: 'D',
    69: 'E',
    70: 'F',
    71: 'G',
    72: 'H',
    73: 'I',
    74: 'J',
    75: 'K',
    76: 'L',
    77: 'M',
    78: 'N',
    79: 'O',
    80: 'P',
    81: 'Q',
    82: 'R',
    83: 'S',
    84: 'T',
    85: 'U',
    86: 'V',
    87: 'W',
    88: 'X',
    89: 'Y',
    90: 'Z',
    91: '[',
    92: '\\',
    93: ']',
    94: '^',
    95: '_',
    96: '`',
    97: 'a',
    98: 'b',
    99: 'c',
    100: 'd',
    101: 'e',
    102: 'f',
    103: 'g',
    104: 'h',
    105: 'i',
    106: 'j',
    107: 'k',
    108: 'l',
    109: 'm',
    110: 'n',
    111: 'o',
    112: 'p',
    113: 'q',
    114: 'r',
    115: 's',
    116: 't',
    117: 'u',
    118: 'v',
    119: 'w',
    120: 'x',
    121: 'y',
    122: 'z',
    123: '{',
    124: '|',
    125: '}',
    126: '~',
    300: ' ',
    461: ' ',
    536: 'DUP',
    544: ' '
};

function ButtonAppBar({ chordLibrary, setChordLibrary }) {
    const [anchorElNav, setAnchorElNav] = React.useState(null);
    const [anchorElUser, setAnchorElUser] = React.useState(null);
    const [openModal, setOpenModal] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [chordInfoMessage, setChordInfoMessage] = React.useState(null);

    const handleOpenNavMenu = (event) => {
        setAnchorElNav(event.currentTarget);
    };

    const handleOpenUserMenu = (event) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const handleOpenModal = () => {
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
    };

    const parseChordsFromJSON = (jsonString, callback) => {
        const data = JSON.parse(jsonString);
        const chordsData = data.chords;

        const chords = chordsData.reduce((acc, chordPair) => {
            if (chordPair.length >= 2) {
                let [chordInput, chordOutput] = chordPair;
                if (typeof chordOutput !== 'undefined') {
                    // Convert the action codes to characters
                    chordInput = chordInput.filter(code => code !== 0).map(code => actionCodes[code]).filter(Boolean).join('+');
                    chordOutput = chordOutput.map(code => actionCodes[code]).filter(Boolean).join('');
                    acc.push({ chordInput, chordOutput });
                }
            }
            return acc;
        }, []);

        callback(chords);
    };


    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
        if (e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const jsonString = event.target.result;
                parseChordsFromJSON(jsonString, (chords) => {
                    if (chords.length === 0) {
                        setChordInfoMessage("The chord file is either invalid or empty.");
                    } else {
                        setChordInfoMessage(`Parsed ${chords.length} chords from the file.`);
                    }
                });
            };
            reader.readAsText(e.target.files[0]);
        }
    };


    const handleFileUpload = () => {
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const jsonString = event.target.result;
                parseChordsFromJSON(jsonString, (chords) => {
                    if (chords.length > 0) {
                        setChordLibrary(chords);
                    }
                });
            };
            reader.readAsText(selectedFile);
        }
        setChordInfoMessage(null);
        handleCloseModal();
    };

    return (
        <div>
            <AppBar position="static">
                <Container maxWidth="xl">
                    <Toolbar disableGutters>
                        <KeyboardAltIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
                        <Typography
                            variant="h6"
                            noWrap
                            component="a"
                            href="./"
                            sx={{
                                mr: 2,
                                display: { xs: 'none', md: 'flex' },
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                color: 'inherit',
                                textDecoration: 'none',
                            }}
                        >
                            CharaChorder Utilities
                        </Typography>

                        <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
                            <Tooltip title="Open menu">
                                <IconButton
                                    size="large"
                                    aria-label="settings menu"
                                    aria-controls="menu-appbar"
                                    aria-haspopup="true"
                                    onClick={handleOpenNavMenu}
                                    color="inherit"
                                >
                                    <MenuIcon />
                                </IconButton>
                            </Tooltip>
                            <Menu
                                id="menu-appbar"
                                anchorEl={anchorElNav}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'left',
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'left',
                                }}
                                open={Boolean(anchorElNav)}
                                onClose={handleCloseNavMenu}
                                sx={{
                                    display: { xs: 'block', md: 'none' },
                                }}
                            >
                                {pages.map((page) => (
                                    <Button key={page} component={Link} to={`/${page.toLowerCase().replace(' ', '-')}`} sx={{ my: 2, display: 'block' }}>
                                        {page}
                                    </Button>
                                ))}
                            </Menu>
                        </Box>
                        <KeyboardAltIcon sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} />
                        <Typography
                            variant="h5"
                            noWrap
                            component="a"
                            href="/"
                            sx={{
                                mr: 2,
                                display: { xs: 'flex', md: 'none' },
                                flexGrow: 1,
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                letterSpacing: '.3rem',
                                color: 'inherit',
                                textDecoration: 'none',
                            }}
                        >
                            CC Utilities
                        </Typography>
                        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
                            {pages.map((page) => (
                                <Button key={page} component={Link} to={`/${page.toLowerCase().replace(' ', '-')}`} sx={{ my: 2, color: 'white', display: 'block' }}>
                                    {page}
                                </Button>
                            ))}
                        </Box>
                        <Typography
                            variant="body1"
                            sx={{ 
                                color: 'white',
                                marginRight: '16px',
                                display: {xs: 'none', md: 'flex'}
                             }}
                        >
                            Chords: {chordLibrary.length}
                        </Typography>
                        <Box sx={{ flexGrow: 0 }}>
                            <Tooltip title="Open settings">
                                <SettingsIcon onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                                </SettingsIcon>
                            </Tooltip>
                            <Menu
                                sx={{ mt: '45px' }}
                                id="menu-appbar"
                                anchorEl={anchorElUser}
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                open={Boolean(anchorElUser)}
                                onClose={handleCloseUserMenu}
                            >
                                {
                                    <MenuItem
                                        key="Load Chord Library"
                                        onClick={() => { handleOpenModal(); handleCloseUserMenu(); }}
                                    >
                                        <Typography textAlign="center">Load Chord Library</Typography>
                                    </MenuItem>
                                }
                            </Menu>
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>
            <Dialog open={openModal} onClose={handleCloseModal}>
                <DialogTitle>Upload Chord Library File</DialogTitle>
                <DialogContent>
                    <DialogContentText>Browse for your exported Chord Backup from <a href="https://manager.charachorder.com/config/layout/">Device Manager</a> for use in the Chord Tools and Practice.</DialogContentText>
                    <Input type="file" accept=".json" onChange={handleFileChange} />
                    <Typography variant="body2" color={(chordInfoMessage && chordInfoMessage.includes('invalid')) ? 'error' : 'textPrimary'}>
                        {chordInfoMessage}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal} color="primary">Cancel</Button>
                    <Button onClick={handleFileUpload} color="primary">Submit</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
export default ButtonAppBar;