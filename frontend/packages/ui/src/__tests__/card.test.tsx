import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/card';

describe('Card', () => {
  it('renders title', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>My Card Title</CardTitle>
        </CardHeader>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'My Card Title' })).toBeInTheDocument();
  });

  it('renders description', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>A short description</CardDescription>
        </CardHeader>
      </Card>,
    );
    expect(screen.getByText('A short description')).toBeInTheDocument();
  });

  it('renders content', () => {
    render(
      <Card>
        <CardContent>Card body content</CardContent>
      </Card>,
    );
    expect(screen.getByText('Card body content')).toBeInTheDocument();
  });

  it('renders footer', () => {
    render(
      <Card>
        <CardFooter>Footer actions</CardFooter>
      </Card>,
    );
    expect(screen.getByText('Footer actions')).toBeInTheDocument();
  });

  it('renders full card with all sections', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Full Card</CardTitle>
          <CardDescription>With all parts</CardDescription>
        </CardHeader>
        <CardContent>Main content here</CardContent>
        <CardFooter>
          <button>Save</button>
        </CardFooter>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Full Card' })).toBeInTheDocument();
    expect(screen.getByText('With all parts')).toBeInTheDocument();
    expect(screen.getByText('Main content here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
