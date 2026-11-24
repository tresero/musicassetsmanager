import { describe, expect, test } from 'vitest';
import { sesRegion, looksLikeAwsSecret, sesSmtpPassword } from './sesPassword';

// AWS's documented example secret key. The expected passwords come from an
// independent Python implementation of the same method.
const EXAMPLE_SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

describe('SES SMTP password', () => {
  test('the region is read from the SES server name', () => {
    expect(sesRegion('email-smtp.us-east-1.amazonaws.com')).toBe('us-east-1');
    expect(sesRegion(' Email-SMTP.eu-west-1.amazonaws.com ')).toBe('eu-west-1');
    expect(sesRegion('email-smtp-fips.us-gov-west-1.amazonaws.com')).toBe('us-gov-west-1');
    expect(sesRegion('smtp.postmarkapp.com')).toBe(null);
    expect(sesRegion('')).toBe(null);
  });

  test('a secret access key is told apart from an SMTP password', () => {
    expect(looksLikeAwsSecret(EXAMPLE_SECRET)).toBe(true);
    expect(looksLikeAwsSecret(` ${EXAMPLE_SECRET}\n`)).toBe(true);
    expect(looksLikeAwsSecret('BLBM/9hSUELfq8Gw+rU1YcBjkOxGbhT2XG763xVLGWL9')).toBe(false);
    expect(looksLikeAwsSecret('short')).toBe(false);
  });

  test('the SMTP password is made from the secret key for the region', async () => {
    expect(await sesSmtpPassword(EXAMPLE_SECRET, 'us-east-1')).toBe('BLBM/9hSUELfq8Gw+rU1YcBjkOxGbhT2XG763xVLGWL9');
    expect(await sesSmtpPassword(EXAMPLE_SECRET, 'eu-west-1')).toBe('BMW5RDrXmmVs0lV7GpI4oLkHXpZ4stDsk6q91z1g38Pk');
  });
});
