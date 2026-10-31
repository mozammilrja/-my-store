import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon, Button } from '../ui';
import { PageContainer } from '../shared';

/** Shown for any URL the admin has no route for, with a way back in. */
export function NotFound() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center gap-space-md py-space-2xl text-center">
        <Icon
          name="explore_off"
          aria-hidden="true"
          className="material-symbols-outlined text-icon-2xl text-faint"
        />
        <div className="flex flex-col gap-1">
          <h1 className="text-title text-primary">This page does not exist</h1>
          <p className="text-body text-muted">
            Nothing in the admin is served at <span className="font-mono text-meta">{pathname}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => navigate('/overview')}>Go to overview</Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
