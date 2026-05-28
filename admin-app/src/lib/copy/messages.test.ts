import { describe, it, expect } from 'vitest';
import {
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  CONFIRMATION_MESSAGES,
  EMPTY_STATE_MESSAGES,
} from './messages';

describe('SUCCESS_MESSAGES', () => {
  it('has title and description for each entry', () => {
    for (const [key, value] of Object.entries(SUCCESS_MESSAGES)) {
      expect(value).toHaveProperty('title');
      expect(value).toHaveProperty('description');
      expect(typeof value.title).toBe('string');
      expect(typeof value.description).toBe('string');
      expect(value.title.length).toBeGreaterThan(0);
      expect(value.description.length).toBeGreaterThan(0);
    }
  });

  it('contains expected keys', () => {
    expect(SUCCESS_MESSAGES.GOAL_CREATED.title).toBe('Goal created');
    expect(SUCCESS_MESSAGES.TASK_COMPLETED.title).toBe('Task completed');
    expect(SUCCESS_MESSAGES.CHANGES_SAVED.title).toBe('Changes saved');
  });

  it('titles do not exceed 5 words', () => {
    for (const value of Object.values(SUCCESS_MESSAGES)) {
      const wordCount = value.title.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(5);
    }
  });
});

describe('ERROR_MESSAGES', () => {
  it('has title and description for each entry', () => {
    for (const value of Object.values(ERROR_MESSAGES)) {
      expect(typeof value.title).toBe('string');
      expect(typeof value.description).toBe('string');
      expect(value.title.length).toBeGreaterThan(0);
    }
  });

  it('error titles start with "Can\'t"', () => {
    for (const value of Object.values(ERROR_MESSAGES)) {
      expect(value.title.startsWith("Can't")).toBe(true);
    }
  });

  it('contains expected keys', () => {
    expect(ERROR_MESSAGES.CANT_LOAD_GOALS.title).toBe("Can't load goals");
    expect(ERROR_MESSAGES.CANT_SAVE.title).toBe("Can't save");
    expect(ERROR_MESSAGES.CANT_DELETE.description).toBe('Try again');
  });
});

describe('LOADING_MESSAGES', () => {
  it('all values are strings ending in ...', () => {
    for (const value of Object.values(LOADING_MESSAGES)) {
      expect(typeof value).toBe('string');
      expect(value.endsWith('...')).toBe(true);
    }
  });

  it('contains expected keys', () => {
    expect(LOADING_MESSAGES.LOADING_GOALS).toBe('Loading goals...');
    expect(LOADING_MESSAGES.PROCESSING).toBe('Processing...');
    expect(LOADING_MESSAGES.SAVING).toBe('Saving...');
  });
});

describe('CONFIRMATION_MESSAGES', () => {
  it('has title and description for each entry', () => {
    for (const value of Object.values(CONFIRMATION_MESSAGES)) {
      expect(typeof value.title).toBe('string');
      expect(typeof value.description).toBe('string');
    }
  });

  it('titles end with ?', () => {
    for (const value of Object.values(CONFIRMATION_MESSAGES)) {
      expect(value.title.endsWith('?')).toBe(true);
    }
  });

  it('contains expected keys', () => {
    expect(CONFIRMATION_MESSAGES.DELETE_GOAL.title).toBe('Delete this goal?');
    expect(CONFIRMATION_MESSAGES.LEAVE_COMPANY.description).toBe("You'll lose all access");
  });
});

describe('EMPTY_STATE_MESSAGES', () => {
  it('has title and description for each entry', () => {
    for (const value of Object.values(EMPTY_STATE_MESSAGES)) {
      expect(typeof value.title).toBe('string');
      expect(typeof value.description).toBe('string');
    }
  });

  it('titles start with "No"', () => {
    for (const value of Object.values(EMPTY_STATE_MESSAGES)) {
      expect(value.title.startsWith('No')).toBe(true);
    }
  });

  it('contains expected keys', () => {
    expect(EMPTY_STATE_MESSAGES.NO_GOALS.title).toBe('No goals yet');
    expect(EMPTY_STATE_MESSAGES.NO_TASKS.description).toBe('Add one to get started');
  });
});
