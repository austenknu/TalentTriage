/**
 * Tests for ScoreRadar component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ScoreRadar from '../ScoreRadar';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock data for testing
const mockCandidateScores = {
  semantic_score: 0.85,
  skills_score: 0.75,
  experience_score: 0.9,
  education_score: 0.8,
};

const mockAverageScores = {
  semantic_score: 0.65,
  skills_score: 0.6,
  experience_score: 0.7,
  education_score: 0.65,
};

// Create a theme for testing
const theme = createTheme();

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Radar: () => <div data-testid="mock-radar-chart">Radar Chart</div>,
}));

describe('ScoreRadar Component', () => {
  it('renders the radar chart with candidate and average scores', () => {
    render(
      <TestWrapper>
        <ScoreRadar 
          candidateScores={mockCandidateScores} 
          averageScores={mockAverageScores} 
        />
      </TestWrapper>
    );

    // Check if chart is rendered
    expect(screen.getByTestId('mock-radar-chart')).toBeInTheDocument();
    
    // Check if title is rendered
    expect(screen.getByText(/Candidate vs. Average Scores/i)).toBeInTheDocument();
  });

  it('renders the radar chart with only candidate scores when average scores are not provided', () => {
    render(
      <TestWrapper>
        <ScoreRadar 
          candidateScores={mockCandidateScores} 
        />
      </TestWrapper>
    );

    // Check if chart is rendered
    expect(screen.getByTestId('mock-radar-chart')).toBeInTheDocument();
  });

  it('displays score labels correctly', () => {
    render(
      <TestWrapper>
        <ScoreRadar 
          candidateScores={mockCandidateScores} 
          averageScores={mockAverageScores} 
        />
      </TestWrapper>
    );

    // Check if score labels are displayed
    expect(screen.getByText(/Semantic/i)).toBeInTheDocument();
    expect(screen.getByText(/Skills/i)).toBeInTheDocument();
    expect(screen.getByText(/Experience/i)).toBeInTheDocument();
    expect(screen.getByText(/Education/i)).toBeInTheDocument();
  });

  it('displays candidate score values', () => {
    render(
      <TestWrapper>
        <ScoreRadar 
          candidateScores={mockCandidateScores} 
          averageScores={mockAverageScores} 
        />
      </TestWrapper>
    );

    // Check if candidate score values are displayed
    expect(screen.getByText(/0.85/)).toBeInTheDocument();
    expect(screen.getByText(/0.75/)).toBeInTheDocument();
    expect(screen.getByText(/0.9/)).toBeInTheDocument();
    expect(screen.getByText(/0.8/)).toBeInTheDocument();
  });

  it('displays a legend with candidate and average labels', () => {
    render(
      <TestWrapper>
        <ScoreRadar 
          candidateScores={mockCandidateScores} 
          averageScores={mockAverageScores} 
        />
      </TestWrapper>
    );

    // Check if legend labels are displayed
    expect(screen.getByText(/Candidate/i)).toBeInTheDocument();
    expect(screen.getByText(/Average/i)).toBeInTheDocument();
  });
});
