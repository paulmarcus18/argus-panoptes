import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';

interface FiltersProps {
  allSystems: string[];
  selectedSystem: string;
  onSystemChange: (value: string) => void;
  repoSearch: string;
  onRepoSearchChange: (value: string) => void;
}

export const Filters = ({
  allSystems,
  selectedSystem,
  onSystemChange,
  repoSearch,
  onRepoSearchChange,
}: FiltersProps) => {
  const handleSystemChange = (event: SelectChangeEvent) => {
    onSystemChange(event.target.value);
  };

  const handleRepoSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onRepoSearchChange(event.target.value);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, marginBottom: 4 }}>
      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel id="system-filter-label">System</InputLabel>
        <Select
          labelId="system-filter-label"
          value={selectedSystem}
          label="System"
          onChange={handleSystemChange}
        >
          {allSystems.map(system => (
            <MenuItem key={system} value={system}>
              {system}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Search Repo"
        variant="outlined"
        value={repoSearch}
        onChange={handleRepoSearchChange}
      />
    </Box>
  );
};
