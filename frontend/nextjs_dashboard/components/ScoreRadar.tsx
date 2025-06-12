/**
 * ScoreRadar component for TalentTriage
 * 
 * This component renders a radar chart comparing a candidate's scores
 * against the average scores for a job.
 */
import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { CandidateScore } from '@/utils/supabase';

// Register Chart.js components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// Define props interface for the ScoreRadar component
interface ScoreRadarProps {
  candidateScore: CandidateScore;
  averageScores: {
    semantic_score: number;
    skills_score: number;
    experience_score: number;
    education_score: number;
    composite_score: number;
  };
  candidateName: string;
}

/**
 * ScoreRadar component for visualizing candidate scores
 * 
 * @param candidateScore - The candidate's score data
 * @param averageScores - Average scores for comparison
 * @param candidateName - Name of the candidate
 */
const ScoreRadar: React.FC<ScoreRadarProps> = ({ 
  candidateScore, 
  averageScores, 
  candidateName 
}) => {
  // Prepare chart data
  const data = {
    labels: [
      'Semantic Match', 
      'Skills Match', 
      'Experience', 
      'Education', 
      'Overall'
    ],
    datasets: [
      {
        label: candidateName || 'Candidate',
        data: [
          candidateScore.semantic_score,
          candidateScore.skills_score,
          candidateScore.experience_score,
          candidateScore.education_score,
          candidateScore.composite_score
        ],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
      },
      {
        label: 'Average',
        data: [
          averageScores.semantic_score,
          averageScores.skills_score,
          averageScores.experience_score,
          averageScores.education_score,
          averageScores.composite_score
        ],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(255, 99, 132, 1)'
      }
    ]
  };

  // Chart options
  const options = {
    scales: {
      r: {
        angleLines: {
          display: true
        },
        suggestedMin: 0,
        suggestedMax: 1
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.raw.toFixed(2);
            return `${label}: ${value}`;
          }
        }
      }
    },
    maintainAspectRatio: false
  };

  return (
    <Paper sx={{ p: 3, height: '100%', minHeight: 400 }}>
      <Typography variant="h6" gutterBottom>
        Score Comparison
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Comparing {candidateName || 'Candidate'} with job average scores
      </Typography>
      <Box sx={{ height: 300 }}>
        <Radar data={data} options={options} />
      </Box>
    </Paper>
  );
};

export default ScoreRadar;
