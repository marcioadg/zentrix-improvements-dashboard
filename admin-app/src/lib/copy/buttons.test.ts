import { BUTTON_COPY } from './buttons';

describe('BUTTON_COPY', () => {
  describe('static values', () => {
    it('has SAVE_GOAL', () => {
      expect(BUTTON_COPY.SAVE_GOAL).toBe('Save Goal');
    });

    it('has CANCEL', () => {
      expect(BUTTON_COPY.CANCEL).toBe('Cancel');
    });

    it('static values are strings', () => {
      expect(typeof BUTTON_COPY.SAVE_GOAL).toBe('string');
      expect(typeof BUTTON_COPY.CANCEL).toBe('string');
    });
  });

  describe('dynamic template functions', () => {
    it('deleteEntity produces correct string', () => {
      expect(BUTTON_COPY.deleteEntity('Task')).toBe('Delete Task');
      expect(BUTTON_COPY.deleteEntity('Goal')).toBe('Delete Goal');
    });

    it('updateEntity produces correct string', () => {
      expect(BUTTON_COPY.updateEntity('Task')).toBe('Update Task');
      expect(BUTTON_COPY.updateEntity('Profile')).toBe('Update Profile');
    });

    it('saveEntity produces correct string', () => {
      expect(BUTTON_COPY.saveEntity('Task')).toBe('Save Task');
      expect(BUTTON_COPY.saveEntity('Meeting')).toBe('Save Meeting');
    });

    it('editEntity produces correct string', () => {
      expect(BUTTON_COPY.editEntity('Task')).toBe('Edit Task');
      expect(BUTTON_COPY.editEntity('Note')).toBe('Edit Note');
    });

    it('archiveEntity produces correct string', () => {
      expect(BUTTON_COPY.archiveEntity('Task')).toBe('Archive Task');
      expect(BUTTON_COPY.archiveEntity('Project')).toBe('Archive Project');
    });

    it('viewEntity produces correct string', () => {
      expect(BUTTON_COPY.viewEntity('Task')).toBe('View Task');
      expect(BUTTON_COPY.viewEntity('Report')).toBe('View Report');
    });

    it('addEntity produces correct string', () => {
      expect(BUTTON_COPY.addEntity('Task')).toBe('Add Task');
      expect(BUTTON_COPY.addEntity('Contact')).toBe('Add Contact');
    });
  });
});
