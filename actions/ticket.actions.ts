'use server'

import Sentry from '@sentry/nextjs'
import { prisma } from '@/db/prisma'
import { revalidatePath } from 'next/cache'
import { logEvent } from '@/utils/semtry'

export async function createTicket(
  prevState: { success: boolean; message: string },
  formData: FormData
): Promise<{
  success: boolean
  message: string
}> {
  try {
    const subject = formData.get('subject') as string
    const description = formData.get('description') as string
    const priority = formData.get('priority') as string

    if (!subject || !description || !priority) {
      logEvent(
        'Validation Error: Missing ticket fields',
        'ticket',
        { subject, description, priority },
        'warning'
      )
      return { success: false, message: 'All fields are required' }
    }
    // 创建 ticket
    const ticket = await prisma.ticket.create({
      data: { subject, description, priority }
    })

    Sentry.addBreadcrumb({
      category: 'Tickets',
      message: `Tickets created ${ticket.id}`,
      level: 'info'
    })

    Sentry.captureMessage(`Tickets created successfully:${ticket.id}`)
    revalidatePath('/tickets')

    return { success: true, message: 'Ticket created successfully' }
  } catch (error) {
    logEvent(
      'An error has occurred while creating ticket.',
      'ticket',
      {
        formData: Object.fromEntries(formData.entries())
      },
      'error',
      error
    )
    return {
      success: false,
      message: 'An error has occurred while creating ticket.'
    }
  }
}

export async function getTickets() {
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createAt: 'desc' }
    })
    logEvent(
      'Fetched Tickets list',
      'ticket',
      { count: tickets.length },
      'info'
    )
    return tickets
  } catch (error) {
    logEvent('Error fetching tickets', 'ticket', {}, 'error', error)
    return []
  }
}

export async function getTicketById(id: string) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: Number(id) }
    })
    if (!ticket) {
      logEvent('Ticket not found', 'ticket', { ticketId: id }, 'warning')
    }

    return ticket
  } catch (error) {
    logEvent(
      'Error fetching ticket details',
      'ticket',
      { ticketId: id },
      'error',
      error
    )
    return null
  }
}
