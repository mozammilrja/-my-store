import React from 'react';
import { ErrorState } from './FeedbackAndOverlays';

/**
 * Catches a render-time throw and shows it in place.
 *
 * Without one of these a single bad field anywhere in a module unmounts the
 * whole React root, which reads to the operator as a blank page with no clue
 * what happened. Remounting on `resetKey` means navigating away and back
 * recovers rather than leaving the view stuck.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Admin view crashed', error, info.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ErrorState
        title={this.props.title || 'This screen could not be displayed'}
        message={
          this.state.error.message ||
          'Something in this view failed to render. The rest of the admin is still usable.'
        }
        onRetry={() => this.setState({ error: null })}
      />
    );
  }
}
