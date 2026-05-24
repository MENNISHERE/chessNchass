export interface ProfileData {
  avatar?: string;
  name?: string;
  username: string;
  followers: number;
  country: string;
  last_online: number;
  joined: number;
  status: string;
  is_streamer: boolean;
  verified: boolean;
  league: string;
}

export interface RatingCategory {
  last?: {
    rating: number;
    date: number;
    rd: number;
  };
  best?: {
    rating: number;
    date: number;
    game: string;
  };
  record?: {
    win: number;
    loss: number;
    draw: number;
  };
}

export interface StatsData {
  chess_daily?: RatingCategory;
  chess_rapid?: RatingCategory;
  chess_bullet?: RatingCategory;
  chess_blitz?: RatingCategory;
  fide?: number;
  tactics?: {
    highest: { rating: number; date: number };
    lowest: { rating: number; date: number };
  };
  puzzle_rush?: {
    best: { total_attempts: number; score: number };
  };
}

export interface ClubData {
  name: string;
  url: string;
  icon: string;
  joined: number;
}

export interface TournamentData {
  url: string;
  id: string;
  status: string;
  wins: number;
  losses: number;
  draws: number;
  points_awarded: number;
  placement: number;
  total_players: number;
}

export interface GameHistoryData {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  tcn: string;
  uuid: string;
  initial_setup: string;
  fen: string;
  time_class: string;
  rules: string;
  white: {
    rating: number;
    result: string;
    '@id': string;
    username: string;
    uuid: string;
  };
  black: {
    rating: number;
    result: string;
    '@id': string;
    username: string;
    uuid: string;
  };
}

export interface ParsedDashboardData {
  username: string;
  last_updated: string;
  ratings: {
    bullet: { current: number | null; peak: number | null };
    blitz: { current: number | null; peak: number | null };
    rapid: { current: number | null; peak: number | null };
  };
  live_game: {
    is_active: boolean;
    opponent: string | null;
    opponent_rating: number | null;
    current_fen: string | null;
  };
}
