import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useStorage(table) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getAll = useCallback(async (options = {}) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from(table).select(options.select || '*')
      if (options.eq) Object.entries(options.eq).forEach(([k, v]) => (query = query.eq(k, v)))
      if (options.order) query = query.order(options.order, { ascending: options.ascending ?? false })
      if (options.limit) query = query.limit(options.limit)
      const { data, error: err } = await query
      if (err) throw err
      return data || []
    } catch (e) {
      setError(e.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [table])

  const getOne = useCallback(async (id, select = '*') => {
    setLoading(true)
    try {
      const { data, error: err } = await supabase.from(table).select(select).eq('id', id).single()
      if (err) throw err
      return data
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [table])

  const insert = useCallback(async (payload) => {
    setLoading(true)
    try {
      const { data, error: err } = await supabase.from(table).insert(payload).select()
      if (err) throw err
      return { data, error: null }
    } catch (e) {
      setError(e.message)
      return { data: null, error: e.message }
    } finally {
      setLoading(false)
    }
  }, [table])

  const update = useCallback(async (id, payload) => {
    setLoading(true)
    try {
      const { data, error: err } = await supabase.from(table).update(payload).eq('id', id).select()
      if (err) throw err
      return { data, error: null }
    } catch (e) {
      setError(e.message)
      return { data: null, error: e.message }
    } finally {
      setLoading(false)
    }
  }, [table])

  const remove = useCallback(async (id) => {
    setLoading(true)
    try {
      const { error: err } = await supabase.from(table).delete().eq('id', id)
      if (err) throw err
      return { error: null }
    } catch (e) {
      setError(e.message)
      return { error: e.message }
    } finally {
      setLoading(false)
    }
  }, [table])

  const upsert = useCallback(async (payload, onConflict = 'id') => {
    setLoading(true)
    try {
      const { data, error: err } = await supabase.from(table).upsert(payload, { onConflict }).select()
      if (err) throw err
      return { data, error: null }
    } catch (e) {
      setError(e.message)
      return { data: null, error: e.message }
    } finally {
      setLoading(false)
    }
  }, [table])

  return { getAll, getOne, insert, update, remove, upsert, loading, error }
}
