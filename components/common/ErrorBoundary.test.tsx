import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const Bomb = () => {
    throw new Error('boom');
};

describe('ErrorBoundary', () => {
    beforeEach(() => {
        // React logs the caught error to the console by default; keep test output clean.
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('muestra la pantalla de recuperación cuando un hijo lanza un error', () => {
        render(
            <ErrorBoundary>
                <Bomb />
            </ErrorBoundary>
        );

        expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
        expect(screen.getByText('Recargar')).toBeInTheDocument();
    });

    it('renderiza el contenido normal cuando no hay error', () => {
        render(
            <ErrorBoundary>
                <p>Todo bien</p>
            </ErrorBoundary>
        );

        expect(screen.getByText('Todo bien')).toBeInTheDocument();
        expect(screen.queryByText('Algo salió mal')).not.toBeInTheDocument();
    });
});
