import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { authenticateAdminRequest } from '../../../../src/lib/auth';

export const dynamic = 'force-dynamic';

// GET — Return whitelist data
export async function GET(req: NextRequest) {
  const { errorResponse, admin } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const [addresses, count] = await Promise.all([
      db.getWhitelistAddresses(),
      db.getWhitelistCount(),
    ]);

    return NextResponse.json({
      success: true,
      count,
      addresses,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch whitelist' },
      { status: 500 }
    );
  }
}

// POST — Import CSV file with wallet addresses
export async function POST(req: NextRequest) {
  const { errorResponse, admin } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    const contentType = req.headers.get('content-type') || '';

    let csvText = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
      }
      csvText = await file.text();
    } else {
      // Accept raw JSON body with addresses array or csv text
      const body = await req.json().catch(() => null);
      if (body?.addresses && Array.isArray(body.addresses)) {
        const count = await db.importWhitelist(body.addresses, admin?.email);
        return NextResponse.json({
          success: true,
          message: `Successfully imported ${count} wallet addresses`,
          count,
        });
      }
      if (body?.csv) {
        csvText = body.csv;
      } else {
        return NextResponse.json({ error: 'No CSV data provided' }, { status: 400 });
      }
    }

    // Parse CSV text to extract wallet addresses
    const addresses = parseCSVWalletAddresses(csvText);

    if (addresses.length === 0) {
      return NextResponse.json(
        { error: 'No valid wallet addresses found in the CSV file. Ensure addresses start with 0x.' },
        { status: 400 }
      );
    }

    const count = await db.importWhitelist(addresses, admin?.email);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${count} wallet addresses`,
      count,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to import whitelist' },
      { status: 500 }
    );
  }
}

// DELETE — Clear the entire whitelist
export async function DELETE(req: NextRequest) {
  const { errorResponse, admin } = await authenticateAdminRequest(req);
  if (errorResponse) return errorResponse;

  try {
    await db.clearWhitelist(admin?.email);
    return NextResponse.json({
      success: true,
      message: 'Whitelist cleared successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to clear whitelist' },
      { status: 500 }
    );
  }
}

/**
 * Parses CSV text and extracts all EVM wallet addresses.
 * Handles: single-column CSVs, multi-column CSVs (looks for columns named
 * wallet, address, wallet_address), and falls back to extracting any 0x-prefixed
 * hex strings from each row.
 */
function parseCSVWalletAddresses(csvText: string): string[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const addresses: string[] = [];
  const evmRegex = /0x[a-fA-F0-9]{40}/g;

  // Try to detect header row
  const firstLine = lines[0].toLowerCase();
  const hasHeader =
    firstLine.includes('wallet') ||
    firstLine.includes('address') ||
    firstLine.includes('addr') ||
    !evmRegex.test(lines[0]);

  const dataLines = hasHeader ? lines.slice(1) : lines;

  // If header exists, try to find the wallet column index
  let walletColIndex = -1;
  if (hasHeader) {
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
    walletColIndex = headers.findIndex(
      (h) =>
        h === 'wallet' ||
        h === 'address' ||
        h === 'wallet_address' ||
        h === 'walletaddress' ||
        h === 'wallet address' ||
        h === 'addr'
    );
  }

  for (const line of dataLines) {
    if (walletColIndex >= 0) {
      // Extract from specific column
      const cols = line.split(',').map((c) => c.trim().replace(/['"]/g, ''));
      const val = cols[walletColIndex];
      if (val && /^0x[a-fA-F0-9]{40}$/.test(val)) {
        addresses.push(val);
        continue;
      }
    }

    // Fallback: extract any 0x address from the line
    const matches = line.match(evmRegex);
    if (matches) {
      addresses.push(...matches);
    }
  }

  return addresses;
}
