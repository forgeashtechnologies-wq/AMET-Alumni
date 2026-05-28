/// <reference types="cypress" />

describe('Disconnect Flow', () => {
  beforeEach(() => {
    // Login as test user
    cy.login('test@example.com', 'password');
    cy.visit('/messages');
  });

  describe('Direct Messages', () => {
    it('should disable send button when disconnected', () => {
      // Navigate to a conversation
      cy.get('[data-testid="conversation-item"]').first().click();
      
      // Disconnect from the user
      cy.get('[data-testid="disconnect-button"]').click();
      cy.get('[data-testid="disconnect-confirm"]').click();
      
      // Verify send button is disabled
      cy.get('textarea[placeholder*="Cannot send messages"]').should('be.disabled');
      cy.get('button[type="submit"]').should('be.disabled');
    });

    it('should show disconnection banner with aria-live', () => {
      cy.get('[data-testid="conversation-item"]').first().click();
      cy.get('[data-testid="disconnect-button"]').click();
      cy.get('[data-testid="disconnect-confirm"]').click();
      
      // Verify banner is visible and accessible
      cy.get('[role="alert"][aria-live="polite"]').should('be.visible');
      cy.contains('You are disconnected from this user').should('be.visible');
      cy.contains('Message history is read-only').should('be.visible');
    });

    it('should preserve message history after disconnect', () => {
      cy.get('[data-testid="conversation-item"]').first().click();
      
      // Get message count before disconnect
      cy.get('[data-testid="message-bubble"]').then(($messages) => {
        const messageCount = $messages.length;
        
        // Disconnect
        cy.get('[data-testid="disconnect-button"]').click();
        cy.get('[data-testid="disconnect-confirm"]').click();
        
        // Verify messages still visible
        cy.get('[data-testid="message-bubble"]').should('have.length', messageCount);
      });
    });

    it('should show cooldown timer on reconnect button', () => {
      cy.get('[data-testid="conversation-item"]').first().click();
      cy.get('[data-testid="disconnect-button"]').click();
      cy.get('[data-testid="disconnect-confirm"]').click();
      
      // Verify reconnect button shows cooldown
      cy.get('button[aria-label*="Reconnect"]').should('be.disabled');
      cy.contains(/Wait \d+h \d+m/).should('be.visible');
    });

    it('should handle race condition when message is in-flight', () => {
      cy.get('[data-testid="conversation-item"]').first().click();
      
      // Type a message
      cy.get('textarea').type('Test message');
      
      // Intercept message send
      cy.intercept('POST', '**/dm_messages', (req) => {
        // Simulate disconnect during send
        req.reply({ delay: 1000, statusCode: 403 });
      }).as('sendMessage');
      
      // Send message
      cy.get('button[type="submit"]').click();
      
      // Verify error toast
      cy.wait('@sendMessage');
      cy.contains('Message could not be sent — connection removed').should('be.visible');
    });

    it('should log disconnect to activity history', () => {
      cy.get('[data-testid="conversation-item"]').first().click();
      cy.get('[data-testid="disconnect-button"]').click();
      cy.get('[data-testid="disconnect-confirm"]').click();
      
      // Verify toast message
      cy.contains('Connection removed (logged in activity history)').should('be.visible');
      
      // Navigate to activity log
      cy.visit('/notifications');
      cy.contains('connection_disconnected').should('be.visible');
    });
  });

  describe('Mentorship Chat', () => {
    beforeEach(() => {
      cy.visit('/mentorship/chat/test-request-id');
    });

    it('should show warning when mentorship active but disconnected', () => {
      // Simulate disconnection
      cy.intercept('POST', '**/rpc/are_users_connected', { body: false });
      
      // Verify warning banner
      cy.get('[role="alert"]').should('contain', 'Connection Required');
      cy.contains('Your mentorship is active, but you are disconnected').should('be.visible');
    });

    it('should make chat read-only when disconnected', () => {
      cy.intercept('POST', '**/rpc/are_users_connected', { body: false });
      
      // Verify input is disabled
      cy.get('input[placeholder*="This conversation is closed"]').should('be.disabled');
      cy.get('button[type="submit"]').should('be.disabled');
    });

    it('should enable chat after reconnection', () => {
      // Start disconnected
      cy.intercept('POST', '**/rpc/are_users_connected', { body: false }).as('checkConnection1');
      cy.wait('@checkConnection1');
      
      // Reconnect
      cy.get('button').contains('Reconnect').click();
      
      // Simulate connection restored
      cy.intercept('POST', '**/rpc/are_users_connected', { body: true }).as('checkConnection2');
      cy.wait('@checkConnection2');
      
      // Verify input is enabled
      cy.get('input[placeholder="Type a message..."]').should('not.be.disabled');
      cy.get('button[type="submit"]').should('not.be.disabled');
    });
  });

  describe('Job Applications', () => {
    beforeEach(() => {
      cy.visit('/jobs/test-job-id/application');
    });

    it('should prevent messaging when disconnected from employer', () => {
      cy.intercept('POST', '**/rpc/are_users_connected', { body: false });
      
      // Try to send message
      cy.get('textarea').type('Question about the job');
      cy.get('button[type="submit"]').click();
      
      // Verify error
      cy.contains('You must reconnect before messaging this employer').should('be.visible');
    });

    it('should handle backend 403 gracefully', () => {
      cy.intercept('POST', '**/job_applications', {
        statusCode: 403,
        body: { message: 'no_messages_when_disconnected' }
      }).as('updateApplication');
      
      cy.get('button').contains('Send Message').click();
      cy.wait('@updateApplication');
      
      // Verify toast
      cy.contains('You must reconnect before messaging this employer').should('be.visible');
    });
  });

  describe('Disconnect Confirmation Dialog', () => {
    beforeEach(() => {
      cy.visit('/messages?tab=connections');
    });

    it('should show impact summary before disconnect', () => {
      cy.get('[data-testid="connection-item"]').first().within(() => {
        cy.get('button').contains('Disconnect').click();
      });
      
      // Verify modal shows impacts
      cy.get('[data-testid="disconnect-modal"]').should('be.visible');
      cy.contains('This will affect:').should('be.visible');
      cy.contains(/\d+ message\(s\) will become read-only/).should('be.visible');
    });

    it('should allow canceling disconnect', () => {
      cy.get('[data-testid="connection-item"]').first().within(() => {
        cy.get('button').contains('Disconnect').click();
      });
      
      cy.get('button').contains('Cancel').click();
      
      // Verify modal closed
      cy.get('[data-testid="disconnect-modal"]').should('not.exist');
    });

    it('should show mentorship warning in impact', () => {
      // Assuming test user has active mentorship
      cy.get('[data-testid="connection-item"]').first().within(() => {
        cy.get('button').contains('Disconnect').click();
      });
      
      cy.contains('1 active mentorship relationship(s)').should('be.visible');
    });
  });

  describe('Avatar Rendering', () => {
    it('should render avatars in directory without layout shift', () => {
      cy.visit('/directory');
      
      // Verify avatars have fixed dimensions
      cy.get('[role="img"]').each(($avatar) => {
        cy.wrap($avatar).should('have.css', 'width');
        cy.wrap($avatar).should('have.css', 'height');
      });
    });

    it('should show initials fallback for missing avatars', () => {
      cy.visit('/directory');
      
      // Find avatar without image
      cy.get('[role="img"]').first().within(() => {
        cy.contains(/^[A-Z]{1,2}$/).should('be.visible');
      });
    });

    it('should render company logos as squares', () => {
      cy.visit('/jobs');
      
      // Verify job card logos are square
      cy.get('[data-testid="company-logo"]').first().should('have.class', 'rounded-md');
    });

    it('should show role badges on avatars', () => {
      cy.visit('/directory');
      
      // Verify badge is visible
      cy.get('[aria-label*="badge"]').should('exist');
    });

    it('should have proper aria-labels', () => {
      cy.visit('/messages');
      
      cy.get('[role="img"]').each(($avatar) => {
        cy.wrap($avatar).should('have.attr', 'aria-label');
      });
    });
  });

  describe('Accessibility', () => {
    it('should announce banner changes to screen readers', () => {
      cy.visit('/messages');
      cy.get('[data-testid="conversation-item"]').first().click();
      
      // Verify aria-live attribute
      cy.get('[role="alert"][aria-live="polite"]').should('exist');
    });

    it('should have descriptive button labels', () => {
      cy.visit('/messages');
      cy.get('[data-testid="conversation-item"]').first().click();
      
      // Disconnect
      cy.get('[data-testid="disconnect-button"]').click();
      cy.get('[data-testid="disconnect-confirm"]').click();
      
      // Verify reconnect button has aria-label
      cy.get('button[aria-label*="Reconnect"]').should('exist');
    });

    it('should hide decorative icons from screen readers', () => {
      cy.visit('/messages');
      cy.get('[data-testid="conversation-item"]').first().click();
      
      // Verify icons have aria-hidden
      cy.get('svg[aria-hidden="true"]').should('exist');
    });
  });
});
